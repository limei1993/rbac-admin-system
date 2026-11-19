/**
 * 按钮级权限定义（种子数据）
 *
 * 「按钮」在数据上就是菜单表里的行，只是 type = 'button'：
 *   - 它挂在对应的页面菜单下面（parentId 指向那个菜单）
 *   - 它不对应任何路由（path 为空），所以不会出现在侧边栏
 *   - 它只承载一个权限标识（perm），后端按它鉴权，前端按它控制按钮显隐
 *
 * 权限标识命名规范：模块:实体:动作
 *   sys   系统管理
 *   user  用户
 *   menu  菜单
 *   role  角色
 *
 * parentName 用菜单名称定位父菜单，不写死 parentId ——
 * 菜单 id 会随数据重建而变化，写死 id 迟早错位。
 */
const BUTTON_DEFS = [
    // 用户管理页面的三个操作按钮
    { parentName: '用户管理', name: '新增用户', perm: 'sys:user:create', sort: 1 },
    { parentName: '用户管理', name: '编辑用户', perm: 'sys:user:update', sort: 2 },
    { parentName: '用户管理', name: '删除用户', perm: 'sys:user:delete', sort: 3 },

    // 菜单管理页面的三个操作按钮
    { parentName: '菜单管理', name: '新建菜单', perm: 'sys:menu:create', sort: 1 },
    { parentName: '菜单管理', name: '编辑菜单', perm: 'sys:menu:update', sort: 2 },
    { parentName: '菜单管理', name: '删除菜单', perm: 'sys:menu:delete', sort: 3 },

    // 角色授权页面的操作按钮
    { parentName: '角色授权', name: '分配权限', perm: 'sys:role:assign', sort: 1 }
]

module.exports = { BUTTON_DEFS }
