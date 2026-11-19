const sequelize = require('../config/db')
const Menu = require('../models/menu')
const Role = require('../models/role')
const RoleMenu = require('../models/roleMenu')

/**
 * 初始化菜单数据 + 角色菜单授权
 *
 * 运行：node scripts/init-menu.js
 *
 * 特点：
 *  1. 幂等 —— 用 findOrCreate，可以反复执行不会产生重复数据
 *  2. 父菜单 ID 不写死 —— 先创建父级拿到真实 id，再用这个 id 建子级
 *     （写死 parentId: 4 这种在数据被删/重排后就会错位）
 *  3. 全程用事务 —— 菜单和授权要么都成功，要么都回滚
 */

/**
 * 菜单定义：用 children 表达层级，执行时自动转成 parentId
 * path 和前端 router/index.js 里的静态路由保持一一对应
 */
const MENU_TREE = [
    { name: '首页',     path: '/', icon: 'HomeFilled',   sort: 1, children: [] },
    { name: '商品管理', path: '/goods',              icon: 'Goods',        sort: 2, children: [] },
    { name: '用户管理', path: '/user',               icon: 'User',         sort: 3, children: [] },
    {
        name: '其他', path: '/other', icon: 'Grid', sort: 4,
        children: [
            { name: '商品列表', path: '/other/goods-list',    icon: 'List',         sort: 1, children: [] },
            { name: '分类展示', path: '/other/category-list', icon: 'FolderOpened', sort: 2, children: [] }
        ]
    },
    {
        // 角色菜单授权页（前端路由 /menu-auth）
        // 只给 admin 角色：下面 ROLE_MENUS 里 user 角色没有勾它
        name: '角色授权', path: '/menu-auth', icon: 'Lock', sort: 5, children: []
    },
    {
        // 菜单管理页（前端路由 /menu-manage）：增删改菜单表本身
        name: '菜单管理', path: '/menu-manage', icon: 'Menu', sort: 6, children: []
    }
]

/**
 * 各角色默认能看到哪些菜单（按菜单名称匹配）
 * admin → 全部菜单
 * user  → 首页、商品管理（看不到「用户管理」，用来演示普通用户和管理员的菜单差异）
 */
const ROLE_MENUS = {
    admin: '*',
    user: ['首页', '商品管理']
}

const run = async () => {
    // 1. 确保表结构是最新的（menu / role_menu 是新表，第一次执行会建出来）
    await sequelize.sync()
    console.log('数据表已就绪')

    const transaction = await sequelize.transaction()

    try {
        // 2. 创建菜单（递归，父级先建）
        const menuIdMap = new Map()   // 菜单名称 → 真实 id

        const createMenus = async (nodes, parentId) => {
            for (const node of nodes) {
                // 注意：Sequelize v6 的 findOrCreate 只接受【一个】options 对象，
                // 不能写成 findOrCreate({where, defaults}, {transaction})
                const [row] = await Menu.findOrCreate({
                    where: { name: node.name, parentId },
                    defaults: {
                        name: node.name,
                        path: node.path,
                        icon: node.icon,
                        parentId,
                        sort: node.sort,
                        visible: true
                    },
                    transaction
                })

                menuIdMap.set(node.name, row.id)
                console.log(`菜单就绪：${'　'.repeat(parentId ? 1 : 0)}${node.name} (id=${row.id}, parentId=${parentId})`)

                if (node.children && node.children.length) {
                    await createMenus(node.children, row.id)
                }
            }
        }

        await createMenus(MENU_TREE, 0)

        // 3. 按角色分配菜单
        for (const [roleName, want] of Object.entries(ROLE_MENUS)) {
            const role = await Role.findOne({ where: { name: roleName } })
            if (!role) {
                console.warn(`跳过：角色 ${roleName} 不存在，请先执行 node scripts/init-rbac.js`)
                continue
            }

            // '*' 表示全部菜单
            let targetIds
            if (want === '*') {
                // 注意：这里查的是「数据库里的全部菜单」，而不是 MENU_TREE 里的那几项。
                // 否则通过「菜单管理」页新建出来的菜单，重跑这个脚本会被踢出授权
                const all = await Menu.findAll({ attributes: ['id'], transaction })
                targetIds = all.map(m => m.id)
            } else {
                targetIds = want.map(name => menuIdMap.get(name)).filter(Boolean)
            }

            // 先删后插，保证和配置完全一致
            await RoleMenu.destroy({ where: { roleId: role.id }, transaction })
            if (targetIds.length) {
                await RoleMenu.bulkCreate(
                    targetIds.map(menuId => ({ roleId: role.id, menuId })),
                    { transaction }
                )
            }

            console.log(`授权完成：角色 ${roleName} → ${targetIds.length} 张菜单`)
        }

        await transaction.commit()

        console.log('\n初始化完成，现在可以：')
        console.log('  1. 重启服务（npm run dev）')
        console.log('  2. 登录后调 GET /menus 查看当前用户菜单')
        process.exit(0)
    } catch (err) {
        await transaction.rollback()
        console.error('初始化失败：', err.message)
        process.exit(1)
    }
}

run().catch(err => {
    console.error('初始化失败：', err.message)
    process.exit(1)
})
