const Database = require('../../../app/database/database');
const Base = require('../../../app/database/base');

describe('Database', () => {
  let config;
  let databaseInstance;

  beforeEach(() => {
    config = {
      database: 'testdb',
      username: 'user',
      password: 'pass',
      modelPath: '/models',
      dbConfig: { dialect: 'sqlite' }
    };
    databaseInstance = new Database(config);
  });

  it('should extend Base', () => {
    expect(databaseInstance).toBeInstanceOf(Base);
    expect(databaseInstance).toBeInstanceOf(Database);
  });

  it('should inherit Base properties', () => {
    expect(databaseInstance.database).toBe(config.database);
    expect(databaseInstance.username).toBe(config.username);
    expect(databaseInstance.password).toBe(config.password);
    expect(databaseInstance.modelPath).toBe(config.modelPath);
    expect(databaseInstance.dbConfig).toBe(config);
  });

  it('should inherit Base methods', () => {
    expect(typeof databaseInstance.connect).toBe('function');
  });
});