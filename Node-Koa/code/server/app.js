const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const bodyparser = require('koa-bodyparser')
const koaLogger = require('koa-logger')
require('./models') 
const error = require('./middleware/error')
const index = require('./routes/index')
const users = require('./routes/users')
const login = require('./routes/login')
const menus = require('./routes/menus')
const profile = require('./routes/profile')  
require('./config/db')
const log = require('./utils/log4js')
// 在 app.js 顶部引入依赖
const koaSwagger = require('koa2-swagger-ui').koaSwagger;
const swaggerJSDoc = require('swagger-jsdoc');

// // log4js 日志
// log.debug('Some debug messages')

// // error handler
// onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(koaLogger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  log.info(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// error
app.use(error())

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())
app.use(login.routes(), login.allowedMethods())
app.use(menus.routes(), menus.allowedMethods())
app.use(profile.routes(), profile.allowedMethods()) 

// 1. 配置 Swagger 的基础信息
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: '我的全栈项目 API 文档',
      version: '1.0.0',
      description: '基于 Koa + Sequelize 的后端接口',
    },
    // 配置全局鉴权，让我们可以在页面里填入 Token
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // 告诉 Swagger 去哪里读取你写的注释
  apis: ['./routes/*.js'], 
});

// 2. 挂载 Swagger 路由 (注意：这行代码必须在所有业务路由注册之前)
app.use(koaSwagger({
  routePrefix: '/swagger',      // 访问地址: http://localhost:3000/swagger
  exposeSpec: true,             // 额外暴露一份 spec JSON
  specPrefix: '/swagger/spec',  // 即 http://localhost:3000/swagger/spec
  swaggerOptions: {
    // 页面已内联 spec，url 置空是为了覆盖掉库默认值里的 petstore 地址，
    // 否则浏览器会去请求外网 petstore3.swagger.io
    url: '',
    spec: swaggerSpec,
  },
}));

// error-handling
app.on('error', (err, ctx) => {
  log.error('server error', err, ctx)
});

module.exports = app
