const sequelize = require('../config/db')
const { DataTypes } = require('sequelize')

/**
 * 角色-菜单关联表：role_menu
 *
 * RBAC 里的「多对多」中间表：
 *   role.id  ←→  role_menu.roleId
 *   menu.id  ←→  role_menu.menuId
 *
 * 一个角色可以有多张菜单，一个菜单也可以属于多个角色
 */
const roleMenu = sequelize.define('role_menu', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // 角色 ID → role.id
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // 菜单 ID → menu.id
    menuId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    freezeTableName: true,
    // 和 userRole.js 保持一致，列名用驼峰
    underscored: false,
    indexes: [
        // 联合唯一索引：同一个角色不能重复授权同一张菜单，
        // 否则每次授权都会插一条重复记录（user_role 表就漏了这个约束）
        { unique: true, fields: ['roleId', 'menuId'] }
    ]
})

module.exports = roleMenu