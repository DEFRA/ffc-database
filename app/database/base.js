const knex = require('knex')
const { createAzureTokenProvider } = require('../auth/azure-token')

const PRODUCTION = 'production'
const defaultPort = 5432
const defaultPoolMin = 2
const defaultPoolMax = 10
const defaultAcquireTimeout = 60000
const defaultIdleTimeout = 10000

const reservedNames = new Set(['client', 'transaction', 'close'])

const isProd = () => {
  return process.env.NODE_ENV === PRODUCTION
}

class Base {
  constructor (config) {
    this.database = config.database
    this.username = config.username
    this.password = config.password
    this.host = config.host || 'localhost'
    this.port = config.port || defaultPort
    this.schema = config.schema
    this.ssl = config.ssl ?? config.dialectOptions?.ssl ?? false
    this.logging = config.logging ?? false
    this.useAzureManagedIdentity = config.useAzureManagedIdentity ?? isProd()
    this.azureClientId = config.azureClientId ?? process.env.AZURE_CLIENT_ID
    this.tables = config.tables ?? {}
    this.dbConfig = config

    const reserved = Object.keys(this.tables).filter(name => reservedNames.has(name))
    if (reserved.length) {
      throw new Error(`Table accessors may not be named: ${reserved.join(', ')}`)
    }
  }

  buildConnection () {
    const passthrough = { ...this.dbConfig.dialectOptions }
    delete passthrough.ssl

    const connection = {
      ...passthrough,
      host: this.host,
      port: this.port,
      database: this.database,
      user: this.username,
      ssl: this.ssl
    }

    if (!this.useAzureManagedIdentity) {
      return { ...connection, password: this.password }
    }

    const tokenProvider = createAzureTokenProvider(this.azureClientId)

    return async () => ({ ...connection, password: await tokenProvider() })
  }

  buildPool () {
    const pool = this.dbConfig.pool ?? {}

    return {
      min: pool.min ?? defaultPoolMin,
      max: pool.max ?? defaultPoolMax,
      acquireTimeoutMillis: pool.acquire ?? defaultAcquireTimeout,
      idleTimeoutMillis: pool.idle ?? defaultIdleTimeout,
      propagateCreateError: false
    }
  }

  buildConfig () {
    const config = {
      client: 'pg',
      connection: this.buildConnection(),
      pool: this.buildPool(),
      acquireConnectionTimeout: this.dbConfig.pool?.acquire ?? defaultAcquireTimeout,
      debug: Boolean(this.logging)
    }

    if (this.schema) {
      config.searchPath = [this.schema]
    }

    return config
  }

  buildTableAccessors (client) {
    return Object.fromEntries(
      Object.entries(this.tables).map(([name, table]) => [
        name,
        (queryable = client) => queryable(table)
      ])
    )
  }

  connect () {
    const client = knex(this.buildConfig())

    return {
      client,
      transaction: client.transaction.bind(client),
      close: client.destroy.bind(client),
      ...this.buildTableAccessors(client)
    }
  }
}

module.exports = Base
