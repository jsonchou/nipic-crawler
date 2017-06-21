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

    let state = {
        page: {
            title: '分类列表',
            rows: []
        }
    };

    //get all table
    await db.queryAsync("SELECT id,category,pic,post_date,update_date from category").then(res => {
        ctx.state = Object.assign(ctx.state, state);
        res = res.map(c => {
            c.post_date = moment(c.post_date).format("YYYY-MM-DD HH:mm:ss");
            c.update_date = moment(c.update_date).format("YYYY-MM-DD HH:mm:ss");
            return c;
        })
        ctx.state.page.rows = res;
    })

    await ctx.render('index', {});

})



module.exports = router;