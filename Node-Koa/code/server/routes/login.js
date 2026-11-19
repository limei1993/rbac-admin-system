const router = require('koa-router')()
const { login, logout } = require('../controller/login')
const { register } = require('../controller/register')

/**
 * @swagger
 * /login:
 *   post:
 *     summary: 管理员登录
 *     tags: [认证模块]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 登录成功，返回 token
 */
router.post('/login', login)
router.post('/logout', logout)

/**
 * @swagger
 * /register:
 *   post:
 *     summary: 用户注册（自助注册，默认普通用户角色）
 *     tags: [认证模块]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: zhangsan
 *               password:
 *                 type: string
 *                 example: "123456"
 *               nickname:
 *                 type: string
 *                 example: 张三
 *     responses:
 *       200:
 *         description: 注册成功，直接返回 token
 *       409:
 *         description: 用户名已被注册
 */

router.post('/register', register) 

module.exports = router