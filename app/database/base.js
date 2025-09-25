const fs = require('fs')
const path = require('path')
const { Sequelize, DataTypes } = require('sequelize')
const db = {}

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
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js')
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

    return db
  }
}

module.exports = Base
