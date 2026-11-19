//require('mysql2/node_modules/iconv-lite').encodingExists('foo'); // 解决Encoding not recognized: 'cesu8'
const request = require('supertest');
const http = require('http');
const koaApp = require('../app'); 
const app = http.createServer(koaApp.callback()); 
const sequelize = require('../config/db'); 

describe('后台管理系统 API 接口测试', () => {
    let token = '';

    // 测试 1：测试登录接口是否成功，并拿到 Token
    test('POST /login - 登录成功应返回 200 和 Token', async () => {
        const res = await request(app)
        .post('/login')
        .send({
            username: 'admin',
            password: '123456'
        })
        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe(200); // 根据你的统一响应体来定
        expect(res.body.data).toHaveProperty('token');

        // 把 token 存下来，给后面的测试用
        token = res.body.data.token; 
    })

    // 测试 2：测试鉴权拦截（不带 Token 访问受保护接口）
    test('GET /users - 未携带 Token 应返回 401 拦截', async () => {
        const res = await request(app).get('/users')
        expect(res.statusCode).toBe(401);
        expect(res.body.msg).toContain('未登录');
    })

    // 测试 3：测试带 Token 成功获取用户列表
    test('GET /users - 携带 Token 应返回 200 和用户列表', async () => {
        const res = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${token}`); // 带上刚才拿到的 token

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe(200);
        expect(res.body.data).toHaveProperty('list'); // 预期返回了列表
    })
})

afterAll(async () => {
  // 所有测试跑完后，关闭数据库连接，告诉 Jest 可以退出啦
  await sequelize.close(); 
});

