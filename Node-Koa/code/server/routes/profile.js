const router = require('koa-router')()
const auth = require('../utils/auth')
const { getProfile } = require('../controller/profile')

router.prefix('/profile')

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: 获取当前登录账号的实时身份与角色
 *     tags: [认证模块]
 *     responses:
 *       200:
 *         description: 成功，返回 id / username / roles
 */
router.get('/', auth, getProfile)

module.exports = router
