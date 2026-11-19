const { Op } = require('sequelize')
const Menu = require('../models/menu')
const Role = require('../models/role')
const RoleMenu = require('../models/roleMenu')
const UserRole = require('../models/userRole')
const { success } = require('../utils/response')
const AppError = require('../utils/AppError')

/**
 * 菜单模块
 *
 * 设计说明：
 *  1. 后端只负责「这个角色能看到哪些菜单」，不下发路由组件。
 *     前端路由是静态注册的（path → 组件），后端只控制菜单可见性。
 *  2. 角色从库里实时查（用 userId → user_role → role_id），
 *     而不是直接读 JWT payload 里的 role。
 *     这样管理员改了权限，用户刷新页面立刻生效，不用等 token 过期。
 */

/**
 * 把平铺的菜单数组组装成树
 */
const buildTree = (list) => {
    // 用 Map 而不是普通对象：菜单 id 是数字，用普通对象当 key 会变成字符串
    const map = new Map()

    list.forEach(item => {
        map.set(item.id, {
            id: item.id,
            parentId: item.parentId,
            name: item.name,
            path: item.path,
            icon: item.icon,
            sort: item.sort,
            visible: item.visible,
            type: item.type || 'menu',
            perm: item.perm || '',
            children: []
        })
    })

    const tree = []
    map.forEach(node => {
        // parentId = 0 → 一级菜单
        if (!node.parentId) {
            tree.push(node)
            return
        }
        // 父节点在结果集里 → 挂到父节点下面
        const parent = map.get(node.parentId)
        if (parent) {
            parent.children.push(node)
        }
        // 父节点不在结果集里（孤儿节点）→ 在 withAncestors 阶段已经补齐过了，
        // 走到这里说明父菜单被隐藏了，这个节点会被 filterVisible 去掉
    })

    return tree
}

/**
 * 补齐「没被授权的父菜单」
 *
 * 场景：只给 user 角色授权了「商品列表」，但没授权它的父级「其他」。
 * 如果不补齐，树组装时子节点会因为找不到 parent 而被直接丢弃，
 * 前端菜单就会莫名其妙少一项。
 */
const withAncestors = async (menus) => {
    const result = [...menus]
    const existIds = new Set(result.map(m => m.id))

    // 还缺哪些父级
    const missingParents = () => {
        const ids = new Set()
        result.forEach(m => {
            if (m.parentId && !existIds.has(m.parentId)) {
                ids.add(m.parentId)
            }
        })
        return ids
    }

    // 每轮要么补进一个新节点、要么查不到就退出，所以一定会终止
    let pending = missingParents()
    while (pending.size) {
        const parents = await Menu.findAll({ where: { id: [...pending] } })
        if (!parents.length) break

        parents.forEach(p => {
            if (!existIds.has(p.id)) {
                existIds.add(p.id)
                result.push(p)
            }
        })

        pending = missingParents()
    }

    return result
}

/**
 * 计算「有效可见」的菜单
 *
 * 规则：visible = false 表示整棵子树都隐藏。
 * 所以一个菜单自己要 visible，它的所有祖先也都要 visible，才算可见。
 */
const filterVisible = (list) => {
    const byId = new Map(list.map(m => [m.id, m]))

    // 判断单个菜单是否可见（沿父链一路往上查）
    const check = (menu, visited = new Set()) => {
        if (menu.visible === false) return false
        if (!menu.parentId) return true
        // 循环引用保护，防止脏数据造成死循环
        if (visited.has(menu.id)) return false
        visited.add(menu.id)

        const parent = byId.get(menu.parentId)
        return parent ? check(parent, visited) : true
    }

    return list.filter(m => check(m))
}

/**
 * 把菜单数组转成树（对外统一出口，先做可见性过滤再组树）
 */
const toTree = (menus) => buildTree(filterVisible(menus))

/**
 * 根据菜单 ID 集合，补齐所有祖先的 ID
 * 用在「给角色分配菜单」的时候：勾选了子菜单，父菜单必须一起给上
 */
const collectWithAncestors = async (menuIds) => {
    const ids = new Set(menuIds.map(Number).filter(id => Number.isInteger(id)))

    let changed = true
    while (changed) {
        changed = false
        const rows = await Menu.findAll({ where: { id: { [Op.in]: [...ids] } } })
        rows.forEach(row => {
            if (row.parentId && !ids.has(row.parentId)) {
                ids.add(row.parentId)
                changed = true
            }
        })
    }

    return [...ids]
}

/**
 * 把菜单模型转成纯对象（方便直接返回给前端）
 */
const toPlain = (menu) => ({
    id: menu.id,
    parentId: menu.parentId,
    name: menu.name,
    path: menu.path,
    icon: menu.icon || '',
    sort: menu.sort,
    visible: menu.visible,
    type: menu.type || 'menu',
    perm: menu.perm || ''
})

/**
 * 向下收集某个菜单的所有子孙 ID（不含自己）
 * 删除菜单时要把子菜单一起删掉
 *
 * @param {number} menuId 起点
 * @param {Set} visited 已经访问过的节点，用来防环
 *        （数据库里如果已经有成环的脏数据，不加这个会无限递归）
 */
const collectDescendantIds = async (menuId, visited = new Set()) => {
    const ids = []
    const children = await Menu.findAll({ where: { parentId: menuId } })

    for (const child of children) {
        if (visited.has(child.id)) continue
        visited.add(child.id)
        ids.push(child.id)
        ids.push(...(await collectDescendantIds(child.id, visited)))
    }

    return ids
}

/**
 * 校验「上级菜单」是否合法
 *
 * 规则：
 *  1. parentId = 0 表示顶级菜单，合法
 *  2. 其他情况必须指向一个真实存在的菜单
 *  3. 不能把自己挂到自己的子树下（会形成环，前端递归渲染会死循环）
 *
 * @param {number} parentId 上级菜单 ID
 * @param {number|null} selfId 当前正在操作的菜单 ID（新增时传 null）
 */
const assertParentValid = async (parentId, selfId = null) => {
    if (!parentId) return   // 0 = 顶级菜单

    const parent = await Menu.findByPk(parentId)
    if (!parent) {
        throw new AppError('上级菜单不存在', 400, 10003)
    }

    if (selfId && parentId === selfId) {
        throw new AppError('上级菜单不能是自己', 400, 10003)
    }

    if (selfId) {
        // 把 selfId 挂到它自己的【子孙】下面会形成环：
        //   4「其他」的子菜单是 5「商品列表」，
        //   如果把 4 的上级改成 5，就变成 4 → 5 → 4 → 5 ……
        // 前端递归渲染这种结构会死循环，所以必须在后端拦住
        const descendants = await collectDescendantIds(selfId)
        if (descendants.includes(parentId)) {
            throw new AppError('上级菜单不能是自己的子菜单', 400, 10003)
        }
    }
}

/**
 * GET /menus
 * 获取「当前登录用户」能看到的菜单树
 */
const getUserMenus = async (ctx) => {
    const user = ctx.state.user
    if (!user) {
        throw new AppError('未登录，请先登录', 401, 40100)
    }

    // 1. 用 userId 实时查角色（支持一个用户多个角色，取并集）
    const links = await UserRole.findAll({ where: { userId: user.id } })
    const roleIds = links.map(l => l.roleId)

    if (!roleIds.length) {
        success(ctx, [])
        return
    }

    // 2. 角色 → 菜单 ID
    const roleMenus = await RoleMenu.findAll({
        where: { roleId: { [Op.in]: roleIds } }
    })
    const menuIds = [...new Set(roleMenus.map(r => r.menuId))]

    if (!menuIds.length) {
        success(ctx, [])
        return
    }

    // 3. 菜单 ID → 菜单数据
    //    注意：这里先不过滤 visible，等补齐祖先之后再统一做可见性判断，
    //    否则会出现「父菜单被隐藏、子菜单却被返回」的孤儿数据
    const menus = await Menu.findAll({
        where: { id: menuIds },
        order: [['sort', 'ASC'], ['id', 'ASC']]
    })

    // 4. 补齐没被授权的父菜单
    const full = await withAncestors(menus)

    // 5. 剔除「按钮」类型：按钮只承载权限码，不该出现在侧边栏。
    //    按钮的权限码由 GET /permissions 单独下发，前端据此控制按钮显隐。
    const pageMenus = full.filter(m => m.type !== 'button')

    // 6. 组装成树返回
    success(ctx, toTree(pageMenus))
}

/**
 * GET /menus/all
 * 获取全部菜单（不分角色）—— 给「角色授权」页面用，只有 admin 能调
 */
const getAllMenus = async (ctx) => {
    const menus = await Menu.findAll({
        order: [['sort', 'ASC'], ['id', 'ASC']]
    })
    success(ctx, toTree(menus))
}

/**
 * GET /menus/roles
 * 获取角色列表 + 每个角色已授权的菜单 ID
 * 前端授权页面直接用这个数据渲染复选框
 */
const getRoles = async (ctx) => {
    const roles = await Role.findAll({ order: [['id', 'ASC']] })
    const roleMenus = await RoleMenu.findAll()

    const list = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        menuIds: roleMenus
            .filter(rm => rm.roleId === role.id)
            .map(rm => rm.menuId)
    }))

    success(ctx, list)
}

/**
 * PUT /menus/roles/:roleId
 * 给某个角色重新分配菜单
 * body: { menuIds: [1, 2, 4, 5] }
 *
 * 用「先删后插」的方式全量覆盖，保证和前端勾选状态完全一致
 */
const assignMenus = async (ctx) => {
    const roleId = Number(ctx.params.roleId)
    const { menuIds } = ctx.request.body || {}

    if (!Number.isInteger(roleId) || roleId <= 0) {
        throw new AppError('角色 ID 不合法', 400, 10001)
    }

    if (!Array.isArray(menuIds)) {
        throw new AppError('menuIds 必须是数组', 400, 10001)
    }

    // 1. 角色必须存在
    const role = await Role.findByPk(roleId)
    if (!role) {
        throw new AppError('角色不存在', 404, 10002)
    }

    // 2. 校验 menuIds 确实存在
    //    防止前端传了脏数据，导致 role_menu 里出现指向不存在菜单的孤儿授权记录
    const numericIds = menuIds.map(Number).filter(id => Number.isInteger(id))
    const validRows = await Menu.findAll({
        where: { id: { [Op.in]: numericIds } },
        attributes: ['id']
    })
    const validIds = new Set(validRows.map(r => r.id))
    const invalidIds = numericIds.filter(id => !validIds.has(id))
    if (invalidIds.length) {
        throw new AppError(`菜单不存在：${invalidIds.join(', ')}`, 400, 10003)
    }

    // 3. 勾选了子菜单就把父菜单一起补上，避免出现「有子没父」的孤儿菜单
    //    （勾了按钮也会把它的父菜单补上 —— 按钮本来就该挂在某个菜单下）
    const finalIds = await collectWithAncestors(menuIds)

    // 3. 事务里先删后插，保证授权数据一致
    const transaction = await Menu.sequelize.transaction()
    try {
        await RoleMenu.destroy({ where: { roleId }, transaction })
        if (finalIds.length) {
            await RoleMenu.bulkCreate(
                finalIds.map(menuId => ({ roleId, menuId })),
                { transaction }
            )
        }
        await transaction.commit()
    } catch (err) {
        await transaction.rollback()
        throw err
    }

    success(ctx, {
        roleId,
        roleName: role.name,
        menuIds: finalIds
    }, '菜单分配成功')
}

/**
 * POST /menus
 * 新增菜单（菜单管理页）
 *
 * 和「角色授权」的区别：
 *   角色授权 = 决定「谁能看见这张菜单」
 *   菜单新增 = 决定「菜单表里有哪些菜单」本身
 */
const createMenu = async (ctx) => {
    const { name, path, icon, parentId, sort, visible, type, perm } = ctx.request.body
    const menuType = type || 'menu'
    const permCode = (perm || '').trim()

    // 0. 类型相关的必填校验
    //    按钮不需要路径（它不对应页面，只承载权限码）
    //    目录和菜单必须有路径，且必须以 / 开头（前端是 hash 路由）
    if (menuType !== 'button') {
        if (!path) {
            throw new AppError('菜单路径不能为空', 400, 10003)
        }
        if (!path.startsWith('/')) {
            throw new AppError('菜单路径必须以 / 开头', 400, 10003)
        }
    }

    // 1. 唯一性校验（按类型分别处理）
    //    - 按钮：path 为空（不占路由），改用权限标识做唯一约束
    //    - 目录 / 菜单：path 必须唯一
    //      （前端路由守卫靠 path 判断权限，同一个 path 出现两次会有歧义）
    if (menuType === 'button') {
        if (!permCode) {
            throw new AppError('按钮类型必须填写权限标识', 400, 10003)
        }
        const samePerm = await Menu.findOne({ where: { perm: permCode } })
        if (samePerm) {
            throw new AppError(`权限标识「${permCode}」已存在`, 400, 10003)
        }
    } else if (path) {
        const same = await Menu.findOne({ where: { path } })
        if (same) {
            throw new AppError(`菜单路径「${path}」已存在`, 400, 10003)
        }
    }

    // 2. 上级菜单是否合法
    await assertParentValid(parentId)

    const menu = await Menu.create({
        name,
        // 按钮不占路由，path 固定存空串（而不是 null，避免唯一索引上的 NULL 语义问题）
        path: menuType === 'button' ? '' : (path || ''),
        icon: icon || '',
        parentId: parentId || 0,
        sort: typeof sort === 'number' ? sort : 0,
        visible: visible === undefined ? true : visible,
        type: menuType,
        perm: permCode
    })

    success(ctx, toPlain(menu), '菜单创建成功')
}

/**
 * PUT /menus/:id
 * 修改菜单
 */
const updateMenu = async (ctx) => {
    const id = Number(ctx.params.id)
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError('菜单 ID 不合法', 400, 10001)
    }

    const menu = await Menu.findByPk(id)
    if (!menu) {
        throw new AppError('菜单不存在', 404, 10002)
    }

    const { name, path, icon, parentId, sort, visible, type, perm } = ctx.request.body

    // 1. 唯一性校验（排除自己）
    //    按钮走权限标识唯一，其余走路径唯一
    const nextType = type || menu.type || 'menu'
    const nextPerm = perm === undefined ? menu.perm : perm.trim()

    if (nextType === 'button') {
        if (!nextPerm) {
            throw new AppError('按钮类型必须填写权限标识', 400, 10003)
        }
        if (nextPerm !== menu.perm) {
            const samePerm = await Menu.findOne({ where: { perm: nextPerm } })
            if (samePerm) {
                throw new AppError(`权限标识「${nextPerm}」已存在`, 400, 10003)
            }
        }
    } else if (path && path !== menu.path) {
        const same = await Menu.findOne({ where: { path } })
        if (same) {
            throw new AppError(`菜单路径「${path}」已存在`, 400, 10003)
        }
    }

    // 2. 换了上级菜单时要重新校验（防止形成环）
    if (parentId !== undefined && parentId !== menu.parentId) {
        await assertParentValid(parentId, id)
    }

    // 3. 只更新真正传了的字段
    const patch = {}
    if (name !== undefined) patch.name = name
    if (path !== undefined) patch.path = nextType === 'button' ? '' : path
    if (icon !== undefined) patch.icon = icon
    if (parentId !== undefined) patch.parentId = parentId
    if (sort !== undefined) patch.sort = sort
    if (visible !== undefined) patch.visible = visible
    if (type !== undefined) patch.type = type
    if (perm !== undefined) patch.perm = nextPerm

    await menu.update(patch)

    success(ctx, toPlain(menu), '菜单修改成功')
}

/**
 * DELETE /menus/:id
 * 删除菜单
 *
 * 级联删除：
 *  1. 它的所有子菜单（一起组成的那棵子树）
 *  2. role_menu 里所有角色对这几张菜单的授权记录
 *     （不清的话会留下孤儿授权数据）
 */
const deleteMenu = async (ctx) => {
    const id = Number(ctx.params.id)
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError('菜单 ID 不合法', 400, 10001)
    }

    const menu = await Menu.findByPk(id)
    if (!menu) {
        throw new AppError('菜单不存在', 404, 10002)
    }

    const childIds = await collectDescendantIds(id)
    const allIds = [id, ...childIds]

    const transaction = await Menu.sequelize.transaction()
    try {
        await RoleMenu.destroy({ where: { menuId: { [Op.in]: allIds } }, transaction })
        await Menu.destroy({ where: { id: { [Op.in]: allIds } }, transaction })
        await transaction.commit()
    } catch (err) {
        await transaction.rollback()
        throw err
    }

    success(ctx, { deletedIds: allIds, count: allIds.length }, `已删除 ${allIds.length} 项菜单`)
}

module.exports = {
    getUserMenus,
    getAllMenus,
    getRoles,
    assignMenus,
    createMenu,
    updateMenu,
    deleteMenu
}
