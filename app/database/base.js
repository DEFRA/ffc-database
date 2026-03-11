const fs = require('node:fs')
const path = require('node:path')
const { Sequelize, DataTypes, Op } = require('sequelize')
const db = {}
const fileExtensionLength = -3

class Base {
  constructor (config) {
    this.database = config.database
    this.username = config.username
    this.password = config.password
    this.modelPath = config.modelPath
    this.dbConfig = config
  }

  connect () {
    const sequelize = new Sequelize(this.database, this.username, this.password, this.dbConfig)
    fs.readdirSync(this.modelPath)
      .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(fileExtensionLength) === '.js')
      })
      .forEach(file => {
        const model = require(path.join(this.modelPath, file))(sequelize, DataTypes)
        db[model.name] = model
      })

    Object.keys(db).forEach(modelName => {
      if (db[modelName].associate) {
        db[modelName].associate(db)
      }
    })

    db.sequelize = sequelize
    db.Sequelize = Sequelize
    db.Op = Op

    return db
  }
}

module.exports = Base
