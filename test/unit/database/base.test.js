const Base = require('../../../app/database/base')
const fs = require('fs')
const path = require('path')
const { Sequelize, Op } = require('sequelize')

jest.mock('fs')
jest.mock('path')
jest.mock('sequelize')
jest.mock('/models/user.js', () => jest.fn().mockReturnValue({ name: 'User' }), { virtual: true })
jest.mock('/models/post.js', () => jest.fn().mockReturnValue({ name: 'Post' }), { virtual: true })

describe('Base', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    test('should store config properties', () => {
      const config = {
        database: 'testdb',
        username: 'user',
        password: 'pass',
        modelPath: '/models',
        host: 'localhost'
      }

      const base = new Base(config)

      expect(base.database).toBe('testdb')
      expect(base.username).toBe('user')
      expect(base.password).toBe('pass')
      expect(base.modelPath).toBe('/models')
      expect(base.dbConfig).toEqual(config)
    })
  })

  describe('connect', () => {
    test('should create Sequelize instance with correct credentials', () => {
      const config = {
        database: 'testdb',
        username: 'user',
        password: 'pass',
        modelPath: '/models',
        host: 'localhost'
      }
      const base = new Base(config)

      fs.readdirSync.mockReturnValue([])
      const mockSequelizeInstance = {}
      Sequelize.mockImplementation(() => mockSequelizeInstance)

      base.connect()

      expect(Sequelize).toHaveBeenCalledWith('testdb', 'user', 'pass', config)
    })

    test('should filter files correctly - only .js files excluding index.js and hidden files', () => {
      const config = {
        database: 'testdb',
        username: 'user',
        password: 'pass',
        modelPath: '/models'
      }
      const base = new Base(config)

      const mockSequelizeInstance = {}
      Sequelize.mockImplementation(() => mockSequelizeInstance)

      // Mock fs.readdirSync to return mixed file types
      fs.readdirSync.mockReturnValue(['user.js', '.hidden.js', 'index.js', 'post.js', 'readme.txt'])
      path.join.mockImplementation((dir, file) => `${dir}/${file}`)

      const result = base.connect()

      expect(fs.readdirSync).toHaveBeenCalledWith('/models')
      expect(result.User).toBeDefined()
      expect(result.Post).toBeDefined()
    })

    test('should return db object with sequelize, Sequelize, and Op properties', () => {
      const config = {
        database: 'testdb',
        username: 'user',
        password: 'pass',
        modelPath: '/models'
      }
      const base = new Base(config)

      const mockSequelizeInstance = {}
      Sequelize.mockImplementation(() => mockSequelizeInstance)
      fs.readdirSync.mockReturnValue([])

      const result = base.connect()

      expect(result).toHaveProperty('sequelize', mockSequelizeInstance)
      expect(result).toHaveProperty('Sequelize', Sequelize)
      expect(result).toHaveProperty('Op', Op)
    })

    test('should handle empty model directory', () => {
      const config = {
        database: 'testdb',
        username: 'user',
        password: 'pass',
        modelPath: '/models'
      }
      const base = new Base(config)

      const mockSequelizeInstance = {}
      Sequelize.mockImplementation(() => mockSequelizeInstance)
      fs.readdirSync.mockReturnValue([])

      expect(() => base.connect()).not.toThrow()
    })
  })
})
