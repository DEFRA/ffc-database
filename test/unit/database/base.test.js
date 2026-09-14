const knex = require('knex')
const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity')
const Base = require('../../../app/database/base')

jest.mock('knex')
jest.mock('@azure/identity')

describe('Base', () => {
  let config
  let mockClient
  let mockTransaction
  let mockDestroy

  beforeEach(() => {
    config = {
      database: 'testdb',
      username: 'user',
      password: 'pass',
      host: 'test-host',
      port: 6432,
      schema: 'test_schema',
      ssl: true,
      logging: false,
      useAzureManagedIdentity: false,
      pool: { min: 1, max: 5, acquire: 1000, idle: 2000 }
    }

    mockTransaction = jest.fn()
    mockDestroy = jest.fn()
    mockClient = Object.assign(jest.fn(), {
      transaction: mockTransaction,
      destroy: mockDestroy
    })

    knex.mockReturnValue(mockClient)
    getBearerTokenProvider.mockReturnValue(jest.fn().mockResolvedValue('a-token'))
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.NODE_ENV
    delete process.env.AZURE_CLIENT_ID
  })

  describe('constructor', () => {
    test('initialises properties from config', () => {
      const base = new Base(config)

      expect(base.database).toBe(config.database)
      expect(base.username).toBe(config.username)
      expect(base.password).toBe(config.password)
      expect(base.host).toBe(config.host)
      expect(base.port).toBe(config.port)
      expect(base.schema).toBe(config.schema)
      expect(base.dbConfig).toBe(config)
    })

    test('applies defaults for host, port, ssl and logging', () => {
      const base = new Base({ database: 'testdb', useAzureManagedIdentity: false })

      expect(base.host).toBe('localhost')
      expect(base.port).toBe(5432)
      expect(base.ssl).toBe(false)
      expect(base.logging).toBe(false)
    })

    test('accepts ssl via dialectOptions for parity with existing service config', () => {
      const base = new Base({ database: 'testdb', dialectOptions: { ssl: true } })

      expect(base.ssl).toBe(true)
    })

    test('defaults to managed identity in production', () => {
      process.env.NODE_ENV = 'production'

      expect(new Base({ database: 'testdb' }).useAzureManagedIdentity).toBe(true)
    })

    test('does not default to managed identity outside production', () => {
      process.env.NODE_ENV = 'development'

      expect(new Base({ database: 'testdb' }).useAzureManagedIdentity).toBe(false)
    })

    test('config flag overrides the environment default', () => {
      process.env.NODE_ENV = 'development'

      expect(new Base({ database: 'testdb', useAzureManagedIdentity: true }).useAzureManagedIdentity).toBe(true)
    })

    test('falls back to AZURE_CLIENT_ID when no client id is configured', () => {
      process.env.AZURE_CLIENT_ID = 'env-client-id'

      expect(new Base({ database: 'testdb' }).azureClientId).toBe('env-client-id')
    })
  })

  describe('buildConnection', () => {
    test('returns a static connection object when not using managed identity', () => {
      const connection = new Base(config).buildConnection()

      expect(connection).toEqual({
        host: 'test-host',
        port: 6432,
        database: 'testdb',
        user: 'user',
        password: 'pass',
        ssl: true
      })
      expect(DefaultAzureCredential).not.toHaveBeenCalled()
    })

    test('returns a function when using managed identity', () => {
      const connection = new Base({ ...config, useAzureManagedIdentity: true }).buildConnection()

      expect(typeof connection).toBe('function')
    })

    test('resolves a fresh token as the password on every call', async () => {
      const tokenProvider = jest.fn()
        .mockResolvedValueOnce('token-one')
        .mockResolvedValueOnce('token-two')
      getBearerTokenProvider.mockReturnValue(tokenProvider)

      const connection = new Base({ ...config, useAzureManagedIdentity: true, azureClientId: 'client-id' }).buildConnection()

      await expect(connection()).resolves.toEqual(expect.objectContaining({ password: 'token-one' }))
      await expect(connection()).resolves.toEqual(expect.objectContaining({ password: 'token-two' }))
      expect(tokenProvider).toHaveBeenCalledTimes(2)
    })

    test('requests a token for the Azure Postgres scope using the configured client id', () => {
      new Base({ ...config, useAzureManagedIdentity: true, azureClientId: 'client-id' }).buildConnection()

      expect(DefaultAzureCredential).toHaveBeenCalledWith({ managedIdentityClientId: 'client-id' })
      expect(getBearerTokenProvider).toHaveBeenCalledWith(
        expect.anything(),
        'https://ossrdbms-aad.database.windows.net/.default'
      )
    })
  })

  describe('table accessors', () => {
    test('exposes an accessor per configured table', () => {
      const db = new Base({ ...config, tables: { generations: 'generations', noNotifys: 'noNotifys' } }).connect()

      expect(typeof db.generations).toBe('function')
      expect(typeof db.noNotifys).toBe('function')
    })

    test('accessor queries its table against the client by default', () => {
      const db = new Base({ ...config, tables: { generations: 'generations' } }).connect()

      db.generations()

      expect(mockClient).toHaveBeenCalledWith('generations')
    })

    test('accessor queries its table against a supplied queryable', () => {
      const trx = jest.fn()
      const db = new Base({ ...config, tables: { generations: 'generations' } }).connect()

      db.generations(trx)

      expect(trx).toHaveBeenCalledWith('generations')
      expect(mockClient).not.toHaveBeenCalled()
    })

    test('rejects table names that would shadow the connection helpers', () => {
      expect(() => new Base({ ...config, tables: { client: 'client' } }))
        .toThrow('Table accessors may not be named: client')
    })
  })

  describe('buildPool', () => {
    test('maps the Sequelize pool shape onto the Knex pool shape', () => {
      expect(new Base(config).buildPool()).toEqual({
        min: 1,
        max: 5,
        acquireTimeoutMillis: 1000,
        idleTimeoutMillis: 2000,
        propagateCreateError: false
      })
    })

    test('applies pool defaults when none are configured', () => {
      expect(new Base({ database: 'testdb' }).buildPool()).toEqual({
        min: 2,
        max: 10,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 10000,
        propagateCreateError: false
      })
    })
  })

  describe('buildConfig', () => {
    test('passes dialectOptions through to the pg client', () => {
      const built = new Base({ ...config, dialectOptions: { statement_timeout: 360000 } }).buildConfig()

      expect(built.connection).toEqual(expect.objectContaining({ statement_timeout: 360000 }))
    })

    test('does not pass dialectOptions.ssl through as a raw option', () => {
      const built = new Base({ ...config, ssl: undefined, dialectOptions: { ssl: true, statement_timeout: 1 } }).buildConfig()

      expect(built.connection.ssl).toBe(true)
      expect(built.connection.statement_timeout).toBe(1)
    })

    test('builds a pg client config', () => {
      const built = new Base(config).buildConfig()

      expect(built.client).toBe('pg')
      expect(built.connection).toEqual(expect.objectContaining({ database: 'testdb' }))
      expect(built.acquireConnectionTimeout).toBe(1000)
    })

    test('maps schema onto searchPath', () => {
      expect(new Base(config).buildConfig().searchPath).toEqual(['test_schema'])
    })

    test('omits searchPath when no schema is configured', () => {
      expect(new Base({ database: 'testdb' }).buildConfig()).not.toHaveProperty('searchPath')
    })

    test('maps logging onto debug', () => {
      expect(new Base({ ...config, logging: true }).buildConfig().debug).toBe(true)
      expect(new Base(config).buildConfig().debug).toBe(false)
    })
  })

  describe('connect', () => {
    test('creates a Knex instance from the built config', () => {
      const base = new Base(config)

      base.connect()

      expect(knex).toHaveBeenCalledWith(base.buildConfig())
    })

    test('returns the client, transaction and close helpers', () => {
      const db = new Base(config).connect()

      expect(db.client).toBe(mockClient)
      expect(typeof db.transaction).toBe('function')
      expect(typeof db.close).toBe('function')
    })

    test('transaction and close delegate to the Knex instance', async () => {
      const db = new Base(config).connect()

      await db.transaction()
      await db.close()

      expect(mockTransaction).toHaveBeenCalled()
      expect(mockDestroy).toHaveBeenCalled()
    })
  })
})
