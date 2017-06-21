'use strict';

const fs = require("fs");
Promise.promisifyAll(fs);

const request = Promise.promisify(require("request"), { multiArgs: true });
Promise.promisifyAll(request, { multiArgs: true })

const path = require('path');
const http = require("http");

const rp = require('request-promise');
const cheerio = require("cheerio");

const moment = require('moment');
const mysql = require('mysql');
Promise.promisifyAll(mysql);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

const db = mysql.createConnection(config.db);

let tmpl = `http://soso.nipic.com/?q={{category}}&k=2&f=JPG&g=1&y=100&w=0&h=0`
const picDir = "H://test";

const router = require('koa-router')();

//ajax api
router.get('/', async(ctx, next) => {

    let category = decodeURIComponent(ctx.query.category);

    let state = {
        page: {
            code: 200,
            message: 'success',
            data: []
        }
    };

    await db.queryAsync("SELECT id,category,pic,post_date,update_date from category where category=?", category).then(res => {
        if (res && res.length) {
            return Promise.map(res, (item, idx) => {
                let url = tmpl.replace("{{category}}", encodeURI(item.category));
                let filename = picDir + "//" + "test" + idx + '.jpg';
                return new Promise((resolve, reject) => {
                    request({
                        url,
                        //encoding: null,
                        method: 'GET',
                        headers: {
                            "Referer": "http://www.nipic.com/index.html",
                            //"Accept-Encoding": "gzip, deflate",
                            "Accept-Language": "en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4",
                            "Cache-Control": "max-age=0",
                            "Connection": "keep-alive",
                            "Host": "soso.nipic.com",
                            "Upgrade-Insecure-Requests": "1",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3080.5 Safari/537.36"
                        }
                    }, (error, response, body) => {
                        if (error) {
                            console.log('error:', error);
                            return reject(error); //skip from error
                        }

                        let $ = cheerio.load(body);
                        let img = $('.search-works-container').children('.search-works-item').eq(0).find('img').attr('src');

                        //console.log(img);

                        //console.log('statusCode:', response && response.statusCode); 
                        //console.log('body:', body); 

                        request.get({
                            "url": img,
                            "headers": {
                                "Content-Type": "application/json",
                            }
                        }).pipe(fs.createWriteStream(filename)).on('finish', () => {
                            resolve(response);
                        })

                        // resolve(response);

                    });
                });
            }, {
                concurrency: 2
            }).then((res) => {
                console.log('done');
            }).catch(err => {
                console.error('fail: ' + err.message);
            })
        }
    }).catch(err => {
        console.log(err);
    })

    ctx.state = Object.assign(ctx.state, state);
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = state;

})


module.exports = router;