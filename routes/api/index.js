'use strict';

const fs = require("fs");
Promise.promisifyAll(fs);

const request = Promise.promisify(require("request"), { multiArgs: true });
Promise.promisifyAll(request, { multiArgs: true })

const path = require('path');
const http = require("http");

const cheerio = require("cheerio");

const imagemin = require('imagemin');
const imageminGuetzli = require('imagemin-guetzli');
const gm = require('gm').subClass({ imageMagick: true });

const moment = require('moment');
const mysql = require('mysql');
Promise.promisifyAll(mysql);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

const db = mysql.createConnection(config.db);

const crawlerConfig = {
    tmpl: `http://soso.nipic.com/?q={{cate}}&k=2&f=JPG&g=1&y=100&w=0&h=0&page=1`,
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
router.get('/:table/:id', async(ctx, next) => {

    let table = ctx.params.table;
    let id = ctx.params.id;

    let state = {
        page: {
            code: 200,
            message: 'success',
            data: []
        }
    };

    let linkTarget = [];

    //获取目标网址
    await db.queryAsync("SELECT id,cate,cate_py,pic,post_date,update_date from ?? where id=?", [table, id]).then(res => {
        if (res && res.length) {
            return Promise.map(res, (item, idx) => {
                let url = crawlerConfig.tmpl.replace("{{cate}}", encodeURIComponent(item.cate));
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

                        let obj = {
                            id: item.id,
                            cate: item.cate,
                            cate_py: item.cate_py,
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

    //获取图片所在页面地址
    async function getUrl(tar) {
        return new Promise((resolve, reject) => {
            request({
                uri: tar.pageLink,
                method: 'GET',
                gzip: true
            }, (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                let $ = cheerio.load(body);
                let imgSrc = $('#J_worksImg').attr('src');
                tar.imgSrc = imgSrc;
                resolve(tar);
            })
        })
    }

    //获取图片
    async function getPic(tar) {
        return new Promise((resolve, reject) => {
            let filename = crawlerConfig.dir + "//" + tar.cate_py + '.jpg';
            request.get({
                "url": tar.imgSrc,
            }).pipe(fs.createWriteStream(filename)).on('finish', () => {
                console.log('finish');
                tar.pic = tar.cate_py + '.jpg';
                resolve(tar)
            }).on('error', (error) => {
                console.log('error');
                reject(error)
            })
        })
    }

    //更新pic字段
    async function updPic(tar) {
        return new Promise((resolve, reject) => {
            db.queryAsync('UPDATE ?? SET pic = ?, update_date=? WHERE id = ?', [table, tar.pic, moment().format('YYYY-MM-DD HH:mm:ss'), tar.id]).then(res => {
                if (res && res.affectedRows) {
                    resolve(tar);
                } else {
                    reject(null);
                }
            }).catch(err => {
                console.log(err);
                reject(err);
            })
        })
    }

    //处理图片尺寸（压缩、裁剪）
    async function fixPic(tar) {
        return new Promise((resolve, reject) => {
            let pic = path.join(crawlerConfig.dir, tar.pic);
            //console.log('tar', tar);
            //console.log('fixPic', pic);

            gm(pic).resize(400, 400)
                .noProfile()
                //.autoOrient()
                .write(path.join(crawlerConfig.dir, 'hehe-' + tar.pic), (err) => {
                    if (err) {
                        console.log(err);
                        return reject(err)
                    }
                    console.log('gm done');
                    resolve(tar);
                })
        })
    }

    for (let i = 0; i < linkTarget.length; i++) {
        console.log('a' + i);
        let item = linkTarget[i];
        let step1 = await getUrl(item);
        let step2 = await getPic(step1);
        let step3 = await updPic(step2);
        let step4 = await fixPic(step3);
        state.page.data.push(step4);
        //console.log('step4', step4);
        console.log('b' + i);
    }

    ctx.state = Object.assign(ctx.state, state);
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = state;

})


module.exports = router;