const sequelize = require('../config/db')
const { DataTypes } = require('sequelize')

const userRole = sequelize.define('user_role', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  roleId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  freezeTableName: true,
  underscored: false
})

module.exports = userRole