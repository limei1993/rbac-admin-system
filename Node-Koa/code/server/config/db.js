const Sequelize = require('sequelize')
const log = require('../utils/log4js')

/**
 * 数据库连接配置
 * 所有参数都支持环境变量覆盖，方便 dev / prd 使用不同配置
 */
const {
  DB_NAME = 'node_koa',
  DB_USER = 'root',
  DB_PASSWORD = 'root123456',
  // 必须写 127.0.0.1 而不是 localhost：
  // 本机 MySQL 开启了 skip_name_resolve，TCP 连接时不会把 127.0.0.1 解析成 localhost，
  // 只能匹配到 root@'127.0.0.1'，写 localhost 会报 Access denied
  DB_HOST = '127.0.0.1',
  DB_PORT = 3306
} = process.env

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  timezone: '+08:00',

  // 指定连接字符集，否则 menu.name 里的中文会存成乱码
  dialectOptions: {
    charset: 'utf8mb4'
  },

  // 操作符别名：Sequelize v6 已废弃字符串操作符（$like / $gt ...），
  // 改用 Symbol：where: { name: { [Op.like]: '%张%' } }
  // 若一定要保留旧写法，可放开下面这段，但启动时会打印 SEQUELIZE0003 弃用警告：
  // operatorsAliases: { $eq: '=', $like: 'LIKE', $gt: '>', $in: 'IN' },

  // 连接池
  pool: {
    max: 5,        // 最大连接数
    min: 0,        // 最小连接数
    acquire: 30000, // 获取连接的最长等待时间（毫秒）
    idle: 10000    // 连接空闲多久后释放（毫秒）
  },

  // 模型默认配置
  define: {
    underscored: true,    // 字段名用下划线：createdAt -> created_at
    timestamps: true,     // 自动创建 created_at / updated_at
    freezeTableName: true // 表名不加复数 s
  },

  // 把 SQL 交给 log4js 统一输出
  logging: sql => log.debug(sql)
})

/**
 * 测试连接
 */
sequelize
  .authenticate()
  .then(() => {
    log.info(`数据库连接成功：${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`)
  })
  .catch(error => {
    log.error(`数据库连接失败：${error.message}`)
  })

module.exports = sequelize
