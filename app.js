"use strict";

const Koa = require('koa');
const app = new Koa();

const router = require('koa-router')();
const views = require('koa-views');
const json = require('koa-json');
const onerror = require('koa-onerror');

const bodyparser = require('koa-bodyparser');
const koaStatic = require("koa-static");

const index = require('./routes/index');

const checkrefer = require('./middlewares/checkrefer');

// middlewares
app.use(bodyparser());
app.use(json());
app.use(koaStatic(__dirname + "/assets", {
    gzip: true
}));
app.use(koaStatic(__dirname + "/html"));

app.use(views(__dirname + '/views', {
    extension: 'ejs'
}));

//app.use(koaStatic(__dirname + "/views/caipu"));

// logger
app.use(async function(ctx, next) {
    const start = new Date();
    var ms;
    try {
        await next();
        if (config.env == "development") {
            ms = new Date() - start;
            logUtil.info(ctx, ms); //开发环境才处理响应日志
        }
    } catch (err) {
        ms = new Date() - start;
        logUtil.error(ctx, err, ms); //错误日志，永远记录
    }
});

//注入中间件
app.use(checkrefer());

//web 路由
router.use('/', index.routes(), index.allowedMethods());

app.use(router.routes(), router.allowedMethods());
// response

app.on('error', (err, ctx) => {
    console.log(err)
    log.error('server error', err, ctx);
});

module.exports = app;