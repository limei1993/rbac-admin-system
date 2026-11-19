const fs = require('fs')
const path = require('path')

const models = {}

// 加载 models 目录下的所有模型文件
fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') && file !== 'index.js' && !file.startsWith('.'))
  .forEach(file => {
    const model = require(path.join(__dirname, file))
    models[model.name] = model
  })

/**
 * 这里【刻意不】调用 sequelize.sync()
 *
 * 之前是在模块加载时自动 sync，存在两个问题：
 *  1. sync 是异步的，调用方无法等待它完成 ——
 *     测试里 afterAll 的 sequelize.close() 可能比 sync 先跑完，
 *     直接报 "ConnectionManager.getConnection was called after the connection manager was closed"
 *  2. 「谁该建表」变成了 import 的副作用，而不是入口显式决定的事，
 *     任何 require 本文件的脚本（脚本 / 测试 / 启动）都会被动触发一次建表
 *
 * 现在改成由入口显式调用 sequelize.sync()：
 *  - bin/www       ：启动时同步表结构，同步成功才开始对外提供服务
 *  - tests/*.test.js：beforeAll 同步，跑完用例再 close
 *
 * 注意：sync 默认 alter: false，只建新表、不改老表结构，
 *       给已有表加字段仍然要写迁移脚本（见 scripts/migrate-perm.js）
 */
module.exports = models
