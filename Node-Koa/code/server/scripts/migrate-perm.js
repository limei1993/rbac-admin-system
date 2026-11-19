const sequelize = require('../config/db')
const Menu = require('../models/menu')
const Role = require('../models/role')
const RoleMenu = require('../models/roleMenu')
const { ensurePermColumns } = require('./ensure-perm-columns')
const { BUTTON_DEFS } = require('./perm-defs')

/**
 * 迁移：引入按钮级权限
 *
 * 运行：node scripts/migrate-perm.js
 *
 * 做三件事：
 *   1. 给 menu 表补上 type / perm 两列（sequelize.sync() 不会给已存在的表加字段）
 *   2. 写入按钮级权限的种子数据（挂在对应页面菜单下）
 *   3. 把所有按钮授权给 admin 角色
 *
 * 幂等：可以反复执行，不会产生重复数据，也不会覆盖管理员在页面上手工改过的授权
 *      （第 3 步只补「admin 缺失的按钮」，不会删掉已有记录）
 */
const run = async () => {
    // 1. 确保表存在
    await sequelize.sync()

    // 2. 补列
    const added = await ensurePermColumns(sequelize)
    console.log(added.length ? `已新增字段：${added.join(', ')}` : '表结构已是最新，无需加列')

    const transaction = await sequelize.transaction()

    try {
        // 3. 写入按钮种子数据
        //    按钮的父菜单用「名称」定位，避免写死 id
        const parentIds = new Map()
        for (const def of BUTTON_DEFS) {
            const parent = await Menu.findOne({ where: { name: def.parentName, parentId: 0 }, transaction })
            if (!parent) {
                console.warn(`跳过「${def.name}」：找不到父菜单「${def.parentName}」，请先执行 node scripts/init-menu.js`)
                continue
            }
            parentIds.set(def.parentName, parent.id)
        }

        let created = 0
        for (const def of BUTTON_DEFS) {
            const parentId = parentIds.get(def.parentName)
            if (!parentId) continue

            const [row, isNew] = await Menu.findOrCreate({
                where: { name: def.name, parentId },
                defaults: {
                    name: def.name,
                    path: '',            // 按钮不占路由
                    icon: '',
                    parentId,
                    sort: def.sort,
                    visible: true,
                    type: 'button',
                    perm: def.perm
                },
                transaction
            })

            // 已存在的记录：如果类型/权限码被人工改过，这里纠正回来
            if (!isNew && (row.type !== 'button' || row.perm !== def.perm)) {
                await row.update({ type: 'button', perm: def.perm }, { transaction })
            }

            if (isNew) created++
            console.log(`按钮就绪：${def.parentName} / ${def.name} (${def.perm}, id=${row.id})`)
        }

        // 4. 把按钮授权给 admin 角色
        //    注意：只【补】admin 缺失的按钮，不删已有授权，
        //    否则管理员在页面上做的调整会被这个脚本覆盖掉
        const admin = await Role.findOne({ where: { name: 'admin' }, transaction })
        if (!admin) {
            console.warn('跳过授权：admin 角色不存在，请先执行 node scripts/init-rbac.js')
        } else {
            const buttonRows = await Menu.findAll({
                where: { type: 'button' },
                attributes: ['id'],
                transaction
            })
            const buttonIds = buttonRows.map(m => m.id)

            const existing = await RoleMenu.findAll({
                where: { roleId: admin.id },
                attributes: ['menuId'],
                transaction
            })
            const existingIds = new Set(existing.map(r => r.menuId))
            const missing = buttonIds.filter(id => !existingIds.has(id))

            if (missing.length) {
                await RoleMenu.bulkCreate(
                    missing.map(menuId => ({ roleId: admin.id, menuId })),
                    { transaction }
                )
            }
            console.log(`admin 角色：新增授权 ${missing.length} 个按钮（共 ${buttonIds.length} 个按钮）`)
        }

        await transaction.commit()

        console.log('\n迁移完成。')
        console.log('接下来可以：')
        console.log('  1. 重启服务（npm run dev）')
        console.log('  2. 打开「角色授权」页，勾选各角色的按钮权限')
        console.log('  3. 登录后调 GET /permissions 查看自己的权限码')
        process.exit(0)
    } catch (err) {
        await transaction.rollback()
        console.error('迁移失败：', err.message)
        process.exit(1)
    }
}

run().catch(err => {
    console.error('迁移失败：', err.message)
    process.exit(1)
})
