const Koa = require('koa')
const app = new Koa()

const middleware = function async(ctx, next) {
    console.log('middleware 1 start')
    console.log(ctx.request.path)
    next()
    console.log('middleware 1 end')
}

const middleware1 = function async(ctx, next) {
    console.log('middleware 2 start')
    console.log(ctx.request.path)
    next()
    console.log('middleware 2 end')
}

const middleware2 = function async(ctx, next) {
    console.log('middleware 3 start')
    console.log(ctx.request.path)
    next()
    console.log('middleware 3 end')
}

const PORT = process.env.PORT || 3000
app.use(middleware)
app.use(middleware1)
app.use(middleware2)
app.listen(PORT, () => {
    console.log(`Koa server is running at http://localhost:${PORT}`)
})
