const sequelize = require('../config/db')
const { DataTypes } = require('sequelize')

/**
 * 菜单表：menu
 *
 * 树形结构，用 parentId 自关联：
 *   parentId = 0 表示这是一级菜单
 *
 * 注意：
 *  1. underscored: false —— 和 userRole.js 保持一致，列名用驼峰 parentId 而不是 parent_id
 *     （db.js 里全局是 underscored: true，但 role.js / userRole.js 都单独覆盖成了 false，
 *      这里必须跟着走，否则 sync 建出来的列名对不上）
 *  2. sequelize.sync() 默认 alter: false，只会建新表、不会改老表结构，
 *     所以这个表一旦建好，后续加字段需要手写 ALTER
 */
const menu = sequelize.define('menu', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  // 父菜单 ID，0 = 一级菜单（不用 null，方便 where 查询和建索引）
  parentId: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  // 菜单名称，前端侧边栏显示的文字
  name: { type: DataTypes.STRING(50), allowNull: false },
  // 前端路由路径，和前端静态路由表里的 path 对应
  path: { type: DataTypes.STRING(100), allowNull: false },
  // Element Plus 图标名，例如 HomeFilled、Goods、User、Grid
  icon: { type: DataTypes.STRING(100), defaultValue: '' },
  // 排序，数字小的排前面
  sort: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  // 0 = 隐藏。隐藏是"整棵子树一起隐藏"，不是只藏自己
  visible: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false }
}, {
  // 冻结表名
  freezeTableName: true,
  // 下划线命名
  underscored: false,
  // 给数据库表建“索引（Index）”
  indexes: [
        { fields: ['parentId'] }
  ]
})

module.exports = menu