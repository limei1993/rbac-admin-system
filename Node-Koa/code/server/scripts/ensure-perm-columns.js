const { DataTypes } = require('sequelize')

/**
 * 给 menu 表补齐「菜单类型」和「权限标识」两列
 *
 * 为什么需要单独的迁移脚本：
 *   sequelize.sync() 默认 alter: false —— 只建【新表】，不会给【已存在的表】加字段。
 *   所以 menu 表一旦建好，模型里新增的 type / perm 字段不会自动出现在数据库里，
 *   启动后任何查询菜单的接口都会报「Unknown column」。
 *
 * 这个函数是幂等的：列已存在就跳过，可以反复执行。
 *
 * @param {object} sequelize sequelize 实例
 */
const ensurePermColumns = async (sequelize) => {
    const qi = sequelize.getQueryInterface()

    // 先看看现在有哪些列
    const columns = await qi.describeTable('menu')

    const added = []

    if (!columns.type) {
        await qi.addColumn('menu', 'type', {
            type: DataTypes.STRING(20),
            defaultValue: 'menu',
            allowNull: false
        })
        added.push('type')
    }

    if (!columns.perm) {
        await qi.addColumn('menu', 'perm', {
            type: DataTypes.STRING(100),
            defaultValue: '',
            allowNull: false
        })
        added.push('perm')
    }

    return added
}

module.exports = { ensurePermColumns }
