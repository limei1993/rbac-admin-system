const router = require('koa-router')()
const User = require('../controller/user')
const auth = require('../utils/auth')
const validate = require('../middleware/validate') // 引入刚才写的中间件
const Joi = require('joi') // 引入 Joi
const rbac = require('../middleware/rbac')
const perm = require('../middleware/perm')

// 1. 定义【新增用户】的校验规则
const createSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': '姓名不能为空',
    'any.required': '必须传入姓名'
  }),
  age: Joi.number().integer().min(0).default(0).messages({
    'number.base': '年龄必须是数字',
    'number.min': '年龄不能小于0'
  }),
  sexlabel: Joi.string().valid('男', '女').messages({
    'any.only': '性别只能是"男"或"女"'
  }),
  // 前端表单会传 birth，必须在 schema 里声明，
  // 否则 Joi 默认拒绝未知字段 → 报 "birth is not allowed"
  birth: Joi.date(),
  addr: Joi.string().allow('', null) // 允许传空字符串或 null
});

// 2. 定义【编辑用户】的规则（多了一个必填的 id）
const updateSchema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().integer().min(0),
  sexlabel: Joi.string().valid('男', '女'),
  // 同 createSchema，前端编辑表单也会传 birth
  birth: Joi.date(),
  addr: Joi.string().allow('', null)
});

router.prefix('/users')
/**
 * @swagger
 * /users:
 *   get:
 *     summary: 获取用户列表
 *     tags: [用户模块]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: pagesize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: 搜索姓名
 *     responses:
 *       200:
 *         description: 成功
 */
// 列表：登录即可读
// （能不能「看到」这个页面由前端菜单权限控制，后端负责的是「能不能改」）
router.get('/', auth, User.listAll)

// 写操作（新增 / 修改 / 删除）一律要求 admin 角色：
//   - rbac 中间件放在 validate 之前，先鉴权再校验参数，
//     避免无权限的人通过参数报错信息探测接口细节
//   - rbac 内部实时查库，管理员把用户降权后，旧 token 立刻失去写权限
router.post('/', auth, perm('sys:user:create'), validate(createSchema), User.create)
// 注意这里变成了 /:id，说明 id 是路径的一部分
router.put('/:id', auth, perm('sys:user:update'), validate(updateSchema), User.update)
router.delete('/:id', auth, perm('sys:user:delete'), User.remove)

module.exports = router
