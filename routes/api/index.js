'use strict';

const fs = require("fs");
Promise.promisifyAll(fs);

const request = Promise.promisify(require("request"), { multiArgs: true });
Promise.promisifyAll(request, { multiArgs: true })

const path = require('path');
const http = require("http");

const cheerio = require("cheerio");

const moment = require('moment');
const mysql = require('mysql');
Promise.promisifyAll(mysql);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

const db = mysql.createConnection(config.db);

const crawlerConfig = {
    tmpl: `http://soso.nipic.com/?q={{category}}&k=2&f=JPG&g=1&y=100&w=0&h=0&page=1`,
    dir: "D://Projects//nipic-crawler//test",
    size: { width: 650, height: 650 },
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
}

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

    let linkTarget = [];

    //获取目标网址
    await db.queryAsync("SELECT id,category,pic,post_date,update_date from category where category=?", category).then(res => {
        if (res && res.length) {
            return Promise.map(res, (item, idx) => {
                let url = crawlerConfig.tmpl.replace("{{category}}", encodeURI(item.category));
                let filename = crawlerConfig.dir + "//" + "test-" + Date.now() + '.jpg';
                return new Promise((resolve, reject) => {
                    request({
                        url,
                        //encoding: null,
                        method: 'GET',
                        headers: crawlerConfig.headers
                    }, (error, response, body) => {
                        if (error) {
                            console.log('error:', error);
                            return reject(error); //skip from error
                        }

                        let $ = cheerio.load(body);
                        let pageLink = $('.search-works-container').children('.search-works-item').eq(0).find('a').attr('href');

                        //console.log(img);

                        //console.log('statusCode:', response && response.statusCode); 
                        //console.log('body:', body); 

                        //console.log(pageLink)

                        let obj = {
                            id: item.id,
                            category: item.category,
                            pic: item.pic,
                            post_date: item.idpost_date,
                            update_date: item.update_date,
                            pageLink
                        };
                        linkTarget.push(obj);

                        resolve(obj);

                    });
                });
            }, {
                concurrency: 2
            }).then((res) => {
                console.log('target url done');
            }).catch(err => {
                console.error('target url fail: ' + err);
            })
        }
    }).catch(err => {
        console.log(err);
    })

    //获取图片
    function getPic(src, tar) {
        return new Promise((resolve, reject) => {
            let filename = crawlerConfig.dir + "//" + tar.category + '.jpg';
            request.get({
                "url": src,
            }).pipe(fs.createWriteStream(filename)).on('finish', () => {
                console.log('finish');
                resolve(tar)
            }).on('error', (error) => {
                console.log('error');
                reject(error)
            })
        })
    }

    //获取图片所在页面地址
    async function getUrl(tar) {
        return new Promise((resolve, reject) => {
            request({
                uri: tar.pageLink,
                method: 'GET',
                gzip: true
            }, async function(error, response, body) {
                if (error) {
                    return reject(error);
                }
                let $ = cheerio.load(body);
                let imgSrc = $('#J_worksImg').attr('src');
                let tag = await getPic(imgSrc, tar);
                console.log(tag);
                resolve(tar);
            })
        })
    }

    for (let i = 0; i < linkTarget.length; i++) {
        console.log('a' + i);
        let tag = await getUrl(linkTarget[i]);
        console.log('b' + i);
    }

    ctx.state = Object.assign(ctx.state, state);
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = state;

})


module.exports = router;