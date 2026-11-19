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
  visible: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
  // 菜单类型：directory(目录) / menu(菜单) / button(按钮)
  //   - directory：只做分组，path 可为空，侧边栏渲染成不可点击的标题
  //   - menu     ：对应一个前端路由，path 必填
  //   - button   ：不对应页面，只承载一个权限码（见 perm 字段），不出现在侧边栏
  type: { type: DataTypes.STRING(20), defaultValue: 'menu', allowNull: false },
  // 权限标识，格式「模块:实体:动作」，例如 sys:user:create
  // 只有 type = button 时才有意义；后端按它做细粒度鉴权，前端按它控制按钮显隐
  perm: { type: DataTypes.STRING(100), defaultValue: '', allowNull: false }
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