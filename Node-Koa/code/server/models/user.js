const sequelize = require('../config/db')
const Sequelize = require('sequelize')
const moment = require('moment')

//  prop: 'name', 'age', 'sexlabel', 'birth', 'addr'

const user = sequelize.define(
  'user',
  {
    id: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      allowNull: false,
      type: Sequelize.STRING(255)
    },
    age: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    sexlabel: Sequelize.STRING,
    birth: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      get() {
        return moment(this.getDataValue('birth')).format('YYYY-MM-DD HH:mm')
      }
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      get() {
        return moment(this.getDataValue('createdAt')).format('YYYY-MM-DD HH:mm')
      }
    },
    updatedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      get() {
        return moment(this.getDataValue('updatedAt')).format('YYYY-MM-DD HH:mm')
      }
    },
    addr: Sequelize.STRING
  },
  {
    freezeTableName: true,
    // 覆盖 db.js 的全局 underscored，列名保持 createdAt / updatedAt，与视频一致
    underscored: false
  }
)

module.exports = user
