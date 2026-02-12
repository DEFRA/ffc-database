const Database = require('../../../app/database/database')
const Base = require('../../../app/database/base')

describe('Database', () => {
  let config
  let databaseInstance

  beforeEach(() => {
    config = {
      database: 'testdb',
      username: 'user',
      password: 'pass',
      modelPath: '/models',
      dbConfig: { dialect: 'sqlite' }
    }
    databaseInstance = new Database(config)
  })

  test('should extend Base', () => {
    expect(databaseInstance).toBeInstanceOf(Base)
    expect(databaseInstance).toBeInstanceOf(Database)
  })

  test('should inherit Base properties', () => {
    expect(databaseInstance.database).toBe(config.database)
    expect(databaseInstance.username).toBe(config.username)
    expect(databaseInstance.password).toBe(config.password)
    expect(databaseInstance.modelPath).toBe(config.modelPath)
    expect(databaseInstance.dbConfig).toBe(config)
  })

  test('should inherit Base methods', () => {
    expect(typeof databaseInstance.connect).toBe('function')
  })
})
