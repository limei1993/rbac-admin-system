const fs = require('fs')
const path = require('path')
const sequelize = require('../config/db')

const models = {}

// 加载 models 目录下的所有模型文件
fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') && file !== 'index.js' && !file.startsWith('.'))
  .forEach(file => {
    const model = require(path.join(__dirname, file))
    models[model.name] = model
  })

// 所有模型注册完成后同步建表
sequelize.sync()

module.exports = models
