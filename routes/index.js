'use strict';

const http = require("http");
const cheerio = require("cheerio");
const request = require('request');
const mysql = require('mysql');
const moment = require('moment');
const Promise = require('bluebird');

Promise.promisifyAll(mysql);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

const db = mysql.createConnection(config.db);

let tmpl = `http://soso.nipic.com/?q={{category}}&k=2&f=JPG&g=1&y=100&w=0&h=0`

const router = require('koa-router')();

router.get('/', async(ctx, next) => {

    let state = {
        page: {
            title: '分类列表',
            rows: []
        }
    };

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

router.post('/crawler/:category', async(ctx, next) => {

    let category = decodeURIComponent(ctx.params.category);

    let state = {
        page: {
            code: 200,
            message: 'success',
            data: []
        }
    };

    await db.queryAsync("SELECT id,category,pic,post_date,update_date from category").then(res => {
        let urls = res.map(c => {
            return tmpl.replace("{{}}", c.category);
        });
    })

    ctx.body = state;
})

module.exports = router;