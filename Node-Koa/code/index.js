const Koa = require('koa')
const app = new Koa()
const Router = require('@koa/router')
const router = new Router()

router.get('/', async (ctx) => {
    ctx.body = 'Hello World'
})

router.get('/api', async (ctx) => {
    ctx.body = 'Hello api'
})

app.use(router.routes()).use(router.allowedMethods())

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Koa server is running at http://localhost:${PORT}`)
})
