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
- **权限管理**：菜单管理（目录 / 菜单 / 按钮三级）、角色授权（勾选式分配菜单与按钮权限）
- **用户管理**：列表分页、搜索、新增、编辑、删除
- **前端权限**：菜单动态下发渲染侧边栏、路由守卫按路径白名单校验、`v-perm` 指令按权限码控制按钮显隐
- **两级鉴权**：`rbac` 守页面级门槛（谁能进管理页），`perm` 守操作级门槛（谁能新增 / 编辑 / 删除）
- **实时鉴权**：角色与按钮权限变更后刷新即生效，旧 Token 不残留越权窗口
- **接口文档**：Swagger UI，可在线调试并携带 Token

---

## 目录结构

```
.
├── my-vue-app/                     # 前端（Vue3 + Vite）
│   ├── src/
│   │   ├── api/                    # 接口封装（login / register / user / menu / permission）
│   │   ├── components/             # 公共组件（侧边栏、顶栏）
│   │   ├── directives/perm.js      # v-perm 指令：按权限码控制按钮显隐
│   │   ├── router/                 # 静态路由表 + 路由守卫
│   │   ├── stores/                 # Pinia：登录态、菜单树、实时角色与权限码
│   │   ├── utils/request.js        # axios 封装（统一错误处理、401 跳登录）
│   │   └── views/                  # 页面（登录/注册/首页/用户/菜单/授权）
│   └── vite.config.js              # dev server + /api 代理
└── Node-Koa/code/server/           # 后端（Koa2）
    ├── bin/www                     # 启动入口
    ├── config/                     # 数据库、JWT 配置
    ├── controller/                 # 业务控制器
    ├── middleware/                 # auth / rbac / perm / validate / error
    ├── models/                     # Sequelize 模型与关联
    ├── routes/                     # 路由定义
    ├── scripts/                    # 幂等初始化脚本 + 迁移脚本
    ├── utils/                      # 响应封装、AppError、日志、鉴权、权限查询
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
| `menu` | 菜单树，`parentId` 自关联，`visible` 控制整棵子树隐藏，`type` 区分目录/菜单/按钮，`perm` 存权限标识 |
| `user_role` | 账号与角色的多对多关联 |
| `role_menu` | 角色与菜单的多对多关联，**联合唯一索引**防重复授权 |
| `user` | 业务用户数据（与登录账号分离） |

### 权限判定链路

```
登录  →  后端签发 JWT（payload 只含 id / username / iss，【不含角色】）
         ↓
前端  →  GET /menus       拉取当前用户菜单树   → 渲染侧边栏（页面级可见性）
         ↓
       →  GET /permissions 拉取当前用户权限码   → 控制按钮显隐（操作级）
         ↓
路由守卫 → 用菜单树中的 path 白名单判断能否访问该页面（体验层）
         ↓
后端接口 → auth 中间件：验 JWT 签名 / 有效期 / issuer，并确认账号仍存在
         ↓          → rbac 中间件【实时查库】比对角色白名单 → 401 / 403
                     → perm 中间件【实时查库】比对权限码白名单 → 403
```

> **两级权限，各管各的**：
> - `rbac(['admin'])` 是**页面级**门槛，管「谁能进这个管理页面 / 用这套功能」；
> - `perm('sys:user:create')` 是**操作级**门槛，管「谁能执行这个具体动作」。
>
> 只用角色粒度太粗 —— 「能看用户列表」和「能删用户」被绑在一起，
> 想给一个只读账号只能把整个菜单关掉；
> 只用权限码粒度又没人守页面级门槛。
> 两级叠加：**rbac 守页面，perm 守操作**。

> **安全边界始终在后端**：前端隐藏按钮与路由拦截只是体验优化，所有写操作接口
> 由中间件统一兜底，前端校验可被绕过。

> **Token 只证明身份，不承载权限**：JWT 的 payload 是 Base64 编码（**不是加密**），
> 任何人都能解出来看；角色一旦写进 Token 就固化成「登录那一刻的快照」，
> 管理员降权后旧 Token 仍能带着 `admin` 通行。因此签发时**只放身份**，
> 角色与权限码一律实时查询得出。
> 管理员调整角色或按钮授权后，用户刷新页面即刻生效，无需重新登录。

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
9. **Token 只证明身份，权限实时查库**：`rbac` 中间件每次请求实时查 `user_role` / `role` 表，
   而不是读取 JWT 里的角色快照。这消除了「管理员降权后，旧 Token 在有效期内仍保留管理员权限」
   的越权窗口；菜单模块与鉴权模块共用同一套口径，多角色按并集计算。
   配套新增 `GET /profile` 接口，让前端按钮显隐与后端拦截基于**同一份实时角色**，
   不会出现「后端已返回 403、前端还亮着按钮」的割裂。
10. **签发时 Token 不写角色**：`role` / `roles` 已从 JWT payload 中移除，Token 只承载
    `id` / `username` / `iss`。从根上杜绝「拿旧 Token 冒充高权限」的可能，
    也避免读代码的人误以为 payload 可信 —— 它只是 Base64，不是密文。
11. **身份有效性双向校验**：`auth` 中间件验签之后再补查一次账号是否存在。JWT 是自包含的，
    签名有效只代表「签发那一刻账号存在」；员工离职被删号后，其 Token 在过期前本应立即失效。
    补查之后，「账号被删」与「Token 过期」行为一致。同时校验 `iss`（签发者），
    防止其他系统用同一密钥签出的 Token 串用。
12. **安全相关中间件一律 fail closed**：身份校验或权限校验查库失败时返回 500 拒绝请求，
    绝不降级放行 —— 鉴权是安全边界，宁可报错也不能「先放行再说」。
13. **有意不引入权限缓存**：每次请求实时查库看似有性能代价，但本项目量级下两次索引查询的
    开销可以忽略；而一旦引入 Redis，就必须配套「角色变更 / 登出 / 重置密码时清缓存」的
    失效逻辑，复杂度上升一个量级。更关键的是，**「权限变更实时生效」正是本系统最有价值的设计点**，
    改成 TTL 缓存会让降权存在生效延迟。若将来量级增长到需要缓存，
    正确做法是「加缓存 + 同时保留主动失效通道」，而不是简单换成 TTL。
14. **按钮级权限：按钮就是菜单表的一行**：`menu` 表增加 `type`
    （directory 目录 / menu 菜单 / button 按钮）与 `perm`（权限标识，如 `sys:user:create`）。
    按钮挂在对应页面菜单下，通过**同一张 `role_menu` 表**授权 —— 所以「授权菜单」和
    「授权按钮」共用一套数据模型，不需要额外的权限表，也不会出现两套授权逻辑打架。
    权限标识命名规范统一为「模块:实体:动作」。
15. **按钮不污染侧边栏**：同一张 `menu` 表承担两种语义，靠 `type` 区分。
    `GET /menus`（侧边栏数据）在组树前剔除 `type = 'button'` 的节点；
    `GET /menus/all`（授权页数据）保留它们，管理员才能勾选。
    前端侧边栏再做一次过滤兜底，双保险。
16. **细粒度权限与后端强绑定**：`perm` 中间件在 `rbac` 之后执行，同样是**实时查库**，
    支持通配写法（`sys:user:*`）。前端用 `v-perm` 指令按**同一份权限码**控制按钮显隐，
    因此不会出现「后端已 403、前端按钮还亮着」的割裂。
    已验证的细粒度场景：只给普通用户授予 `sys:user:create` 而**不**授予 `sys:user:delete`，
    该用户能新增、能看列表，但调用删除接口返回 403 —— 这正是角色粒度做不到的事。

---

## 接口一览

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/login` | 登录，返回 token | 公开 |
| POST | `/register` | 注册（角色固定为普通用户，服务端不读 body.role） | 公开 |
| POST | `/logout` | 登出（JWT 无状态，服务端仅返回成功，由前端清除 token） | 公开 |
| GET | `/menus` | 当前用户菜单树（**不含按钮**） | 登录 |
| GET | `/menus/all` | 全部菜单（**含按钮**，授权页用） | admin |
| GET | `/menus/roles` | 角色列表及已授权菜单 ID | admin |
| PUT | `/menus/roles/:roleId` | 给角色分配菜单与按钮（事务） | `sys:role:assign` |
| POST | `/menus` | 新增菜单 | `sys:menu:create` |
| PUT | `/menus/:id` | 修改菜单 | `sys:menu:update` |
| DELETE | `/menus/:id` | 删除菜单（级联子菜单与授权记录） | `sys:menu:delete` |
| GET | `/users` | 用户列表（分页 / 搜索） | 登录 |
| POST | `/users` | 新增用户 | `sys:user:create` |
| PUT | `/users/:id` | 修改用户 | `sys:user:update` |
| DELETE | `/users/:id` | 删除用户 | `sys:user:delete` |
| GET | `/profile` | 当前登录账号的实时身份与角色 | 登录 |
| GET | `/permissions` | 当前登录账号的权限码列表 | 登录 |

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
node scripts/init-menu.js    # 创建菜单树 + 按钮权限种子，并按角色分配
```

三个脚本均为幂等，可重复执行。

> **如果是已存在的旧库**：`sequelize.sync()` 只建表、**不会给已存在的表加字段**，
> 所以旧库要先跑一次迁移脚本补 `menu.type` / `menu.perm` 两列并写入按钮权限种子：
>
> ```bash
> node scripts/migrate-perm.js
> ```
>
> 该脚本同样幂等（只补 admin 角色缺失的按钮授权，不覆盖人工调整过的结果）；
> 全新安装直接跑 `init-menu.js` 即可，不需要额外执行迁移。

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

> ⚠️ **安全提示**：以上账号口令与 `config/db.js`、`config/jwt.js` 中的默认配置**仅供本地演示**，
> 本仓库为公开仓库，请勿直接部署到公网环境。生产部署前必须替换数据库密码、
> 设置随机的 `JWT_SECRET`，并关闭 `init-admin` 脚本。

---

## 配置项（环境变量）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 后端端口 |
| `NODE_ENV` | - | 设为 `production` 时强制要求 `JWT_SECRET` |
| `JWT_SECRET` | 开发默认值 | JWT 签名密钥，**生产必填** |
| `JWT_EXPIRES` | `2h` | Token 有效期 |
| `JWT_ISSUER` | `rbac-admin-system` | Token 签发者标识（`iss`），校验时强制匹配，防止 Token 串用 |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `node_koa` / `root` / - | 数据库连接 |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | 数据库地址（开 `skip_name_resolve` 时请用 `127.0.0.1`） |
| `LOG_LEVEL` / `LOG_DIR` / `LOG_FILE` | `debug` / `logs` / `true` | 日志配置 |

完整模板见 [`Node-Koa/code/server/.env.example`](Node-Koa/code/server/.env.example)。

---

## 已知限制与后续计划

诚实记录当前尚未覆盖的部分，也是后续迭代方向：

- [x] **权限粒度**：已落地按钮级权限码体系（`sys:user:create` / `sys:menu:delete` 等），
      接口鉴权不再只到「角色能否访问」，可以表达「能看不能改」
- [ ] **权限码全覆盖**：目前只有用户管理、菜单管理、角色授权三组接口接了权限码，
      其余写接口仍是「登录即可」，待按同一套规范补齐
- [ ] **强制失效**：账号被删除后其 Token 已能立即失效（`auth` 中间件实时查账号），
      但 Token 本身在有效期内仍无法主动失效 —— 用户点「退出登录」后，只要 Token 没过期理论上仍可被重放。
      待引入 token 版本号或黑名单
- [ ] **测试**：已接入 Jest + Supertest，待补齐权限矩阵回归用例
- [x] **数据迁移**：已引入 `scripts/migrate-perm.js` 管理表结构演进（补列 + 种子数据），
      后续字段变更按同一模式追加
- [ ] **操作审计**：权限变更等高危动作尚未落审计日志
- [ ] **数据聚合层**：首页看板数据目前为前端静态数据，计划下沉为后端聚合接口

---

## License

MIT
