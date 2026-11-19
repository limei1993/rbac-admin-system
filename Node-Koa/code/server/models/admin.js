const sequelize = require('../config/db')
const Sequelize = require('sequelize')

// 管理员表：admin
// 表结构由sequelize.sync()自动生成,不用主动写建表的SQL语句
const admin = sequelize.define(
  'admin',
  {
    id: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    // 存 bcrypt 哈希（60 个字符），不是明文
    password: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    nickname: Sequelize.STRING(50)
  },
  {
    freezeTableName: true,
    // 覆盖 db.js 的全局 underscored，列名保持 createdAt / updatedAt，与视频一致
    underscored: false
  }
)

module.exports = admin
