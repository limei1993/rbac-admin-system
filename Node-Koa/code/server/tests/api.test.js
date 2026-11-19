//require('mysql2/node_modules/iconv-lite').encodingExists('foo'); // 解决 Encoding not recognized: 'cesu8'
const request = require('supertest');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const koaApp = require('../app');
const app = http.createServer(koaApp.callback());
const sequelize = require('../config/db');
const Admin = require('../models/admin');
const { JWT_SECRET, JWT_ISSUER } = require('../config/jwt');

/**
 * 递归遍历菜单树
 */
const walk = (list, fn) => {
    (list || []).forEach((item) => {
        fn(item);
        if (item.children && item.children.length) walk(item.children, fn);
    });
};

describe('后台管理系统 API 接口测试', () => {
    let token = '';

    // 临时普通账号：故意【不绑定任何角色】，因此一条权限码都没有
    // 用随机后缀避免和真实数据冲突，跑完即删
    const tempUsername = `__perm_test_${Date.now()}`;
    let tempUserId = null;
    let tempToken = '';

    beforeAll(async () => {
        // 表结构同步必须【等它完成】再开始跑用例。
        // 之前是在 require('./models') 时就发起 sync（import 副作用），
        // 而 afterAll 里的 sequelize.close() 可能先跑完，
        // 直接报 "ConnectionManager.getConnection was called after the connection manager was closed"。
        await sequelize.sync();

        const created = await Admin.create({
            username: tempUsername,
            password: bcrypt.hashSync('123456', 10),
            nickname: '权限测试临时账号'
        });
        tempUserId = created.id;
    });

    afterAll(async () => {
        // 先清理临时账号，再关数据库连接（顺序反了会拿不到连接）
        if (tempUserId) {
            await Admin.destroy({ where: { id: tempUserId } });
        }
        await sequelize.close();
    });

    // ===== 1. 登录 =====

    // 测试 1：测试登录接口是否成功，并拿到 Token
    test('POST /login - 登录成功应返回 200 和 Token', async () => {
        const res = await request(app)
            .post('/login')
            .send({
                username: 'admin',
                password: '123456'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe(200); // 根据你的统一响应体来定
        expect(res.body.data).toHaveProperty('token');

        // 把 token 存下来，给后面的测试用
        token = res.body.data.token;
    })

    // ===== 2. 身份鉴权 =====

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

    // 测试 4：JWT 只证明身份，payload 里【不能】带角色快照
    // 这是整个权限改造的基石：角色写进 token 就会固化成登录那一刻的快照，
    // 管理员降权后旧 token 依然持有旧权限 → 越权
    test('JWT payload - 只含身份信息，不含 role / roles', async () => {
        const decoded = jwt.decode(token);

        expect(decoded).toHaveProperty('id');
        expect(decoded).toHaveProperty('username');
        expect(decoded.role).toBeUndefined();
        expect(decoded.roles).toBeUndefined();
        // 签发者标识，防止别的系统用同一密钥签出来的 token 串用
        expect(decoded.iss).toBe(JWT_ISSUER);
    })

    // 测试 5：issuer 不匹配的 Token 必须被拒
    test('GET /users - issuer 不匹配的 Token 应返回 401', async () => {
        const badToken = jwt.sign(
            { id: 1, username: 'admin' },
            JWT_SECRET,
            { expiresIn: '2h', issuer: 'another-system' }
        );

        const res = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${badToken}`);

        expect(res.statusCode).toBe(401);
    })

    // ===== 3. 权限码 =====

    // 测试 6：权限码接口返回当前用户的实时权限码
    test('GET /permissions - 应返回当前用户的权限码数组', async () => {
        const res = await request(app)
            .get('/permissions')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        // admin 角色已被授予按钮级权限码
        // （若数据库还没迁移，先执行 node scripts/migrate-perm.js）
        expect(res.body.data).toContain('sys:user:create');
    })

    // 测试 7：按钮权限不能混进侧边栏菜单树
    test('GET /menus - 返回的菜单树里不应出现 button 类型节点', async () => {
        const res = await request(app)
            .get('/menus')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);

        const types = [];
        walk(res.body.data, (item) => types.push(item.type));

        expect(types.length).toBeGreaterThan(0);
        expect(types).not.toContain('button');
    })

    // 测试 8：无权限账号调写接口必须 403（而不是靠前端隐藏按钮兜底）
    test('POST /users - 无权限账号应返回 403', async () => {
        const loginRes = await request(app)
            .post('/login')
            .send({ username: tempUsername, password: '123456' });
        expect(loginRes.statusCode).toBe(200);
        tempToken = loginRes.body.data.token;

        const res = await request(app)
            .post('/users')
            .set('Authorization', `Bearer ${tempToken}`)
            .send({ name: '越权测试', age: 18, sexlabel: '男' });

        expect(res.statusCode).toBe(403);
        expect(res.body.msg).toContain('权限不足');
    })

    // ===== 4. 账号存在性校验 =====

    // 测试 9：账号被删除后，它手里的 Token 必须【立即】失效
    // JWT 是自包含的，签名有效只代表「签发那一刻这个账号存在」，
    // 不查库的话，员工离职删号后旧 token 过期前照样能调接口
    test('GET /users - 账号被删除后旧 Token 应立即失效返回 401', async () => {
        await Admin.destroy({ where: { id: tempUserId } });
        tempUserId = null; // 已删除，afterAll 不再重复清理

        const res = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${tempToken}`);

        expect(res.statusCode).toBe(401);
        expect(res.body.msg).toContain('账号不存在');
    })
})
