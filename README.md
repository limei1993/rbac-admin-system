# RBAC 权限驱动的后台管理系统

基于前后端分离架构独立开发的后台管理系统，核心是一套完整的「菜单 + 角色」权限模块，
覆盖从接口鉴权、菜单动态管理、角色授权到前端路由级权限控制的完整链路。

> 技术栈：Vue3 + Vite + Element Plus + Pinia + Koa2 + Sequelize + MySQL + JWT

---

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 前端 | Vue3、Vue Router 4、Pinia、Element Plus、Axios、ECharts、Vite |
| 后端 | Node.js、Koa2、koa-router、koa-bodyparser、Sequelize ORM、MySQL |
| 安全与校验 | JWT（无状态鉴权）、bcryptjs（密码哈希）、Joi（白名单式入参校验） |
| 工程化 | swagger-jsdoc + koa2-swagger-ui、log4js（分级日志）、Joi、PM2、Nodemon |

---

## 功能一览

- **认证**：注册、登录、登出；JWT 无状态签发，密码 bcrypt 哈希存储
- **权限管理**：菜单管理（树形增删改查）、角色授权（勾选式分配菜单）
- **用户管理**：列表分页、搜索、新增、编辑、删除
- **前端权限**：菜单动态下发渲染侧边栏、路由守卫按路径白名单校验、按钮级显隐
- **接口文档**：Swagger UI，可在线调试并携带 Token

---

## 目录结构

```
.
├── my-vue-app/                     # 前端（Vue3 + Vite）
│   ├── src/
│   │   ├── api/                    # 接口封装（login / register / user / menu）
│   │   ├── components/             # 公共组件（侧边栏、顶栏）
│   │   ├── router/                 # 静态路由表 + 路由守卫
│   │   ├── stores/                 # Pinia：登录态、菜单树
│   │   ├── utils/request.js        # axios 封装（统一错误处理、401 跳登录）
│   │   └── views/                  # 页面（登录/注册/首页/用户/菜单/授权）
│   └── vite.config.js              # dev server + /api 代理
└── Node-Koa/code/server/           # 后端（Koa2）
    ├── bin/www                     # 启动入口
    ├── config/                     # 数据库、JWT 配置
    ├── controller/                 # 业务控制器
    ├── middleware/                 # auth / rbac / validate / error
    ├── models/                     # Sequelize 模型与关联
    ├── routes/                     # 路由定义
    ├── scripts/                    # 幂等初始化脚本
    ├── utils/                      # 响应封装、AppError、日志、鉴权
    └── app.js                      # 中间件装配
```

---

## 权限模型

### 数据表关系

```
        admin (账号)                role (角色)              menu (菜单)
            │                          │                        │
            └──────── user_role ────────┘                        │
                          │                                       │
                          └──────────── role_menu ───────────────┘
                                  (两张多对多中间表)
```

| 表 | 说明 |
| --- | --- |
| `admin` | 登录账号，密码存 bcrypt 哈希 |
| `role` | 角色（admin / user） |
| `menu` | 菜单树，`parentId` 自关联，`visible` 控制整棵子树隐藏 |
| `user_role` | 账号与角色的多对多关联 |
| `role_menu` | 角色与菜单的多对多关联，**联合唯一索引**防重复授权 |
| `user` | 业务用户数据（与登录账号分离） |

### 权限判定链路

```
登录  →  后端签发 JWT（payload 含 id / username / role）
         ↓
前端  →  GET /menus 拉取当前用户菜单树 → 渲染侧边栏
         ↓
路由守卫 → 用菜单树中的 path 白名单判断能否访问该页面（体验层）
         ↓
后端接口 → auth 中间件验 JWT 身份 → rbac 中间件比对角色白名单 → 401 / 403
```

> **安全边界始终在后端**：前端隐藏按钮与路由拦截只是体验优化，所有写操作接口
> 由中间件统一兜底，前端校验可被绕过。

---

## 关键设计点

1. **防账号枚举**：登录时即使账号不存在也会执行一次 bcrypt 比对（对固定的假哈希），
   使「账号不存在」与「密码错误」的响应耗时一致，避免被用来批量探测账号。
2. **菜单树三类边界处理**
   - 仅授权子菜单、未授权父菜单时，补齐所有祖先节点，避免组树阶段丢失子节点；
   - `visible = false` 语义为「整棵子树一起隐藏」，因此先做可见性过滤再组树，
     避免出现「父菜单隐藏、子菜单却露出来」的孤儿数据；
   - 菜单可调整上级，通过递归收集子孙节点做**防环校验**，防止形成环引用导致前端递归渲染死循环。
3. **授权数据一致性**：角色授权采用「事务 + 先删后插」，保证数据库与前端勾选状态完全一致，
   中途失败自动 rollback；删除菜单时级联删除全部子菜单，并清理 `role_menu` 中的授权记录，避免孤儿数据。
4. **白名单式入参校验**：Joi 校验通过后把过滤后的干净数据回写请求体，未知字段直接拒绝，
   既防脏数据入库，也防越权字段写入。
5. **错误分级透出**：自定义 `AppError` 标记「预期内错误」，全局异常中间件对其原样透传；
   意外异常统一返回模糊提示，不暴露内部细节（数据库报错、堆栈等）。
6. **密钥与配置外置**：数据库连接、JWT 密钥、日志级别全部走环境变量注入；
   **生产环境未配置 `JWT_SECRET` 时服务直接拒绝启动**，避免默认密钥被用于生产。
7. **幂等初始化脚本**：`init-admin` / `init-rbac` / `init-menu` 均使用 `findOrCreate`，
   重复执行不会产生脏数据。
8. **防拖库**：列表接口对分页参数做上下限约束（单页最多 100 条），避免 `pagesize` 被恶意放大。

---

## 接口一览

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/login` | 登录，返回 token | 公开 |
| POST | `/register` | 注册（角色固定为普通用户，服务端不读 body.role） | 公开 |
| POST | `/logout` | 登出（JWT 无状态，服务端仅返回成功，由前端清除 token） | 公开 |
| GET | `/menus` | 当前用户菜单树 | 登录 |
| GET | `/menus/all` | 全部菜单 | admin |
| GET | `/menus/roles` | 角色列表及已授权菜单 ID | admin |
| PUT | `/menus/roles/:roleId` | 给角色分配菜单（事务） | admin |
| POST | `/menus` | 新增菜单 | admin |
| PUT | `/menus/:id` | 修改菜单 | admin |
| DELETE | `/menus/:id` | 删除菜单（级联子菜单与授权记录） | admin |
| GET | `/users` | 用户列表（分页 / 搜索） | 登录 |
| POST | `/users` | 新增用户 | 登录 |
| PUT | `/users/:id` | 修改用户 | 登录 |
| DELETE | `/users/:id` | 删除用户 | admin |

在线文档：<http://localhost:3000/swagger>

---

## 本地运行

### 环境要求

- Node.js ≥ 18
- MySQL ≥ 5.7

### 1. 准备数据库

```bash
# 需手动建库（Sequelize sync 只建表不建库）
mysql -uroot -p -e "CREATE DATABASE node_koa DEFAULT CHARSET utf8mb4;"
```

### 2. 启动后端

```bash
cd Node-Koa/code/server
npm install

# 按需配置环境变量（不配置也能以开发默认值启动）
export JWT_SECRET=your-secret
export DB_PASSWORD=your-password

npm run dev          # nodemon 热重载，端口 3000
```

表结构在首次启动时由 Sequelize 自动创建。

### 3. 初始化基础数据

```bash
cd Node-Koa/code/server
node scripts/init-admin.js   # 创建/重置管理员 admin / 123456
node scripts/init-rbac.js    # 创建角色并绑定管理员
node scripts/init-menu.js    # 创建菜单树并按角色分配
```

三个脚本均为幂等，可重复执行。

### 4. 启动前端

```bash
cd my-vue-app
npm install
npm run dev          # Vite dev server，端口 5174，/api 已代理到 3000
```

访问 <http://localhost:5174>，接口文档见 <http://localhost:3000/swagger>。

### 测试账号

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `123456` | 超级管理员（全部菜单） |
| `fronttest01` | `123456` | 普通用户 |

---

## 配置项（环境变量）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 后端端口 |
| `NODE_ENV` | - | 设为 `production` 时强制要求 `JWT_SECRET` |
| `JWT_SECRET` | 开发默认值 | JWT 签名密钥，**生产必填** |
| `JWT_EXPIRES` | `2h` | Token 有效期 |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `node_koa` / `root` / - | 数据库连接 |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | 数据库地址（开 `skip_name_resolve` 时请用 `127.0.0.1`） |
| `LOG_LEVEL` / `LOG_DIR` / `LOG_FILE` | `debug` / `logs` / `true` | 日志配置 |

完整模板见 [`Node-Koa/code/server/.env.example`](Node-Koa/code/server/.env.example)。

---

## 已知限制与后续计划

诚实记录当前尚未覆盖的部分，也是后续迭代方向：

- [ ] **权限粒度**：当前接口鉴权只到「角色能否访问」，无法表达「能看不能改」，需要引入权限码（`user:create`）体系
- [ ] **强制失效**：JWT 签发后在有效期内无法主动失效（登出仅清除前端 token），待引入 token 版本号或黑名单
- [ ] **按钮级权限**：前端尚未沉淀权限指令与权限码工具函数，目前仅路径级控制
- [ ] **测试**：已接入 Jest + Supertest，待补齐权限矩阵回归用例
- [ ] **数据迁移**：当前依赖 `sequelize.sync()` 建表，待引入迁移脚本管理表结构演进
- [ ] **操作审计**：权限变更等高危动作尚未落审计日志
- [ ] **数据聚合层**：首页看板数据目前为前端静态数据，计划下沉为后端聚合接口

---

## License

MIT
