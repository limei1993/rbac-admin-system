const router = require('koa-router')()
const Joi = require('joi')
const {
    getUserMenus,
    getAllMenus,
    getRoles,
    assignMenus,
    createMenu,
    updateMenu,
    deleteMenu
} = require('../controller/menu')
const auth = require('../utils/auth')
const rbac = require('../middleware/rbac')
const perm = require('../middleware/perm')
const validate = require('../middleware/validate')

// 1. 定义【分配菜单】的校验规则
const assignSchema = Joi.object({
    menuIds: Joi.array()
        .items(Joi.number().integer())
        .required()
        .messages({
            'array.base': 'menuIds 必须是数组',
            'array.items': 'menuIds 里的每一项必须是数字',
            'any.required': '必须传入 menuIds'
        })
})

// 2. 定义【新增菜单】的校验规则
const createSchema = Joi.object({
    name: Joi.string().trim().min(1).max(50).required().messages({
        'string.empty': '菜单名称不能为空',
        'any.required': '必须传入菜单名称'
    }),
    // 路径：按钮类型不需要路径（它不对应页面，只承载权限码），
    // 所以这里统一允许空串，由 controller 按 type 再做必填与格式校验
    path: Joi.string().trim().max(100).allow('').default('').messages({
        'string.max': '菜单路径不能超过 100 个字符'
    }),
    icon: Joi.string().trim().max(100).allow('').default(''),
    parentId: Joi.number().integer().min(0).default(0),
    sort: Joi.number().integer().default(0),
    visible: Joi.boolean().default(true),
    // 菜单类型：directory(目录) / menu(菜单) / button(按钮)
    type: Joi.string().valid('directory', 'menu', 'button').default('menu').messages({
        'any.only': '菜单类型只能是 directory / menu / button'
    }),
    // 权限标识，格式「模块:实体:动作」，例如 sys:user:create
    perm: Joi.string().trim().max(100).allow('').default('').messages({
        'string.max': '权限标识不能超过 100 个字符'
    })
})

// 3. 定义【修改菜单】的校验规则（全部可选，允许只改其中一项）
const updateSchema = Joi.object({
    name: Joi.string().trim().min(1).max(50).optional().messages({
        'string.empty': '菜单名称不能为空'
    }),
    path: Joi.string().trim().max(100).allow('').optional().messages({
        'string.max': '菜单路径不能超过 100 个字符'
    }),
    icon: Joi.string().trim().max(100).allow('').optional(),
    parentId: Joi.number().integer().min(0).optional(),
    sort: Joi.number().integer().optional(),
    visible: Joi.boolean().optional(),
    type: Joi.string().valid('directory', 'menu', 'button').optional().messages({
        'any.only': '菜单类型只能是 directory / menu / button'
    }),
    perm: Joi.string().trim().max(100).allow('').optional().messages({
        'string.max': '权限标识不能超过 100 个字符'
    })
})

router.prefix('/menus')

/**
 * @swagger
 * /menus:
 *   get:
 *     summary: 获取当前登录用户的菜单树
 *     tags: [菜单模块]
 *     responses:
 *       200:
 *         description: 成功，返回该角色可见的菜单树
 */
router.get('/', auth, getUserMenus)

/**
 * @swagger
 * /menus/all:
 *   get:
 *     summary: 获取全部菜单（角色授权页面用，仅管理员）
 *     tags: [菜单模块]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/all', auth, rbac(['admin']), getAllMenus)

/**
 * @swagger
 * /menus/roles:
 *   get:
 *     summary: 获取角色列表及各角色已授权的菜单ID（仅管理员）
 *     tags: [菜单模块]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/roles', auth, rbac(['admin']), getRoles)

/**
 * @swagger
 * /menus/roles/{roleId}:
 *   put:
 *     summary: 给角色分配菜单（仅管理员）
 *     tags: [菜单模块]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 角色ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [menuIds]
 *             properties:
 *               menuIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 4, 5]
 *     responses:
 *       200:
 *         description: 分配成功
 */
router.put('/roles/:roleId', auth, perm('sys:role:assign'), validate(assignSchema), assignMenus)

/**
 * @swagger
 * /menus:
 *   post:
 *     summary: 新增菜单（仅管理员）
 *     tags: [菜单模块]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, path]
 *             properties:
 *               name:
 *                 type: string
 *                 example: 角色授权
 *               path:
 *                 type: string
 *                 example: /menu-auth
 *               icon:
 *                 type: string
 *                 example: Lock
 *               parentId:
 *                 type: integer
 *                 example: 0
 *               sort:
 *                 type: integer
 *                 example: 5
 *               visible:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/', auth, perm('sys:menu:create'), validate(createSchema), createMenu)

/**
 * @swagger
 * /menus/{id}:
 *   put:
 *     summary: 修改菜单（仅管理员）
 *     tags: [菜单模块]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 菜单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               path: { type: string }
 *               icon: { type: string }
 *               parentId: { type: integer }
 *               sort: { type: integer }
 *               visible: { type: boolean }
 *     responses:
 *       200:
 *         description: 成功
 */
router.put('/:id', auth, perm('sys:menu:update'), validate(updateSchema), updateMenu)

/**
 * @swagger
 * /menus/{id}:
 *   delete:
 *     summary: 删除菜单（级联删除子菜单，仅管理员）
 *     tags: [菜单模块]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 菜单ID
 *     responses:
 *       200:
 *         description: 成功
 */
router.delete('/:id', auth, perm('sys:menu:delete'), deleteMenu)

module.exports = router
