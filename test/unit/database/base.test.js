const fs = require('fs')
const path = require('path')
const os = require('os')
const { Sequelize, DataTypes, Op } = require('sequelize')
const Base = require('../../../app/database/base')

jest.mock('sequelize')

describe('Base', () => {
  let config
  let baseInstance
  let mockSequelize
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-models-'))
    
    fs.writeFileSync(
      path.join(tempDir, 'model1.js'),
      'module.exports = (sequelize, DataTypes) => ({ name: "Model1", associate: jest.fn() })'
    )
    fs.writeFileSync(
      path.join(tempDir, 'model2.js'),
      'module.exports = (sequelize, DataTypes) => ({ name: "Model2" })'
    )
    fs.writeFileSync(path.join(tempDir, 'index.js'), '')
    fs.writeFileSync(path.join(tempDir, '.hidden.js'), '')
    fs.writeFileSync(path.join(tempDir, 'readme.txt'), '')
    
    config = {
      database: 'testdb',
      username: 'user',
      password: 'pass',
      modelPath: tempDir,
      dialect: 'sqlite'
    }
    baseInstance = new Base(config)

    mockSequelize = { authenticate: jest.fn() }
    Sequelize.mockImplementation(() => mockSequelize)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('initializes all properties from config', () => {
      expect(baseInstance.database).toBe(config.database)
      expect(baseInstance.username).toBe(config.username)
      expect(baseInstance.password).toBe(config.password)
      expect(baseInstance.modelPath).toBe(config.modelPath)
      expect(baseInstance.dbConfig).toBe(config)
    })
  })

  describe('connect', () => {
    it('creates Sequelize instance with correct parameters', () => {
      baseInstance.connect()
      expect(Sequelize).toHaveBeenCalledWith(
        config.database,
        config.username,
        config.password,
        config
      )
    })

    it('loads valid model files and filters out invalid ones', () => {
      const db = baseInstance.connect()
      
      expect(db.Model1).toBeDefined()
      expect(db.Model2).toBeDefined()
      expect(db.index).toBeUndefined()
      expect(db.hidden).toBeUndefined()
      expect(db.readme).toBeUndefined()
    })

    it('skips associate on models without it', () => {
      const db = baseInstance.connect()
      expect(db.Model2.associate).toBeUndefined()
    })

    it('returns db object with sequelize, Sequelize, and Op', () => {
      const db = baseInstance.connect()
      
      expect(db.sequelize).toBe(mockSequelize)
      expect(db.Sequelize).toBe(Sequelize)
      expect(db.Op).toBe(Op)
    })

    it('throws error for invalid modelPath', () => {
      const badConfig = { ...config, modelPath: '/nonexistent/path' }
      const badInstance = new Base(badConfig)
      
      expect(() => badInstance.connect()).toThrow()
    })
  })
})