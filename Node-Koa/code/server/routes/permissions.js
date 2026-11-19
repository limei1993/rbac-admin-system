const router = require('koa-router')()
const { getPermissions } = require('../controller/permission')
const auth = require('../utils/auth')

router.prefix('/permissions')

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: 获取当前登录账号的权限码列表
 *     tags: [权限模块]
 *     responses:
 *       200:
 *         description: 成功，返回权限码数组，例如 ["sys:user:create"]
 */
router.get('/', auth, getPermissions)

module.exports = router
