'use strict';

const http = require("http");
const mysql = require('mysql');
const moment = require('moment');

Promise.promisifyAll(mysql);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

const db = mysql.createConnection(config.db);

const router = require('koa-router')();

router.get('/', async(ctx, next) => {
    await ctx.render('index', {});
})



module.exports = router;