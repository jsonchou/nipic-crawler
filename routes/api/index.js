'use strict';

const fs = require("fs");
const request = require("request");

const path = require('path');
const http = require("http");

const cheerio = require("cheerio");

//const sharp = require("sharp");

const moment = require('moment');
const mysql = require('mysql');

const db = mysql.createConnection(config.db);

const size = 3; //40 60 100

const crawlerConfig = {
    tmpl: `http://soso.nipic.com/?q={{cate}}&k=2&f=JPG&g=1&y=${size}&w=0&h=0&page=1`,
    dir: "D://Projects//www.jsoncdn.com//cdn//chi//cate",
    size: { width: 400, height: 400 },
    headers: {
        "Referer": "http://www.nipic.com/index.html",
        //"Accept-Encoding": "gzip, deflate",
        //"Accept-Language": "en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4",
        //"Cache-Control": "max-age=0",
        //"Connection": "keep-alive",
        //"Host": "soso.nipic.com",
        //"Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3080.5 Safari/537.36"
    }
}

const router = require('koa-router')();

//ajax api
router.get('/:table', async(ctx, next) => {

    let table = ctx.params.table;

    let pageData = {
        code: 200,
        message: 'success',
        data: []
    }

    async function getAllTable() {
        return new Promise((resolve, reject) => {
            db.query("SELECT id,cate,cate_py,pic,post_date,update_date from ??", [table], (error, results, fields) => {
                if (error) {
                    return reject(error);
                }
                results = results.map(c => {
                    c.post_date = moment(c.post_date).format("YYYY-MM-DD HH:mm:ss");
                    c.update_date = moment(c.update_date).format("YYYY-MM-DD HH:mm:ss");
                    return c;
                })
                resolve(results);
            });
        })
    }

    //get all table
    pageData.data = await getAllTable();
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = pageData;

})

//ajax cut api
router.get('/cut/:table', async(ctx, next) => {

    let table = ctx.params.table;
    let id = ctx.query.id;

    let pageData = {
        code: 200,
        message: 'success',
        data: []
    }

    //get db data;
    async function getData() {
        return new Promise((resolve, reject) => {
            db.query("SELECT id,cate,cate_py,pic,post_date,update_date from ??  " + (id ? " where id=? " : ""), id ? [table, id] : [table], (error, results, fields) => {
                if (error) {
                    return reject(error);
                }
                results = results.map(c => {
                    c.post_date = moment(c.post_date).format("YYYY-MM-DD HH:mm:ss");
                    c.update_date = moment(c.update_date).format("YYYY-MM-DD HH:mm:ss");
                    return c;
                })
                resolve(results);
            });
        })
    }

    //get single cate from db data;
    async function getDataLink(tar) {
        let url = crawlerConfig.tmpl.replace("{{cate}}", encodeURIComponent(tar.cate));
        console.time('getDataLink');
        return new Promise((resolve, reject) => {
            request.get({
                url,
                timeout: 1000 * 60 * 5,
                //encoding: null,
                headers: crawlerConfig.headers
            }, (error, response, body) => {
                if (error) {
                    console.log('error:', error);
                    return reject(error); //skip from error
                }
                console.timeEnd('getDataLink');

                let $ = cheerio.load(body);
                let box = $('.search-works-container').children('.search-works-item')
                let pageLinkLens = box.length;
                let rdx = Math.floor(Math.random() * pageLinkLens - 1) //下一页占用一个box 
                let pageLink = box.eq(rdx).find('a').attr('href');

                tar.pageLink = pageLink;

                resolve(tar);

            });
        });
    }

    let tbTarget = await getData();

    //获取图片所在页面地址
    async function getUrl(tar) {
        console.time('getUrl');
        return new Promise((resolve, reject) => {
            request.get({
                url: tar.pageLink,
                timeout: 1000 * 60 * 5,
            }, (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                console.timeEnd('getUrl');
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
            let filename = path.join(crawlerConfig.dir, tar.cate_py + '.jpg');
            console.time('getPic');
            request.get({
                url: tar.imgSrc,
                timeout: 1000 * 60 * 5
            }).pipe(fs.createWriteStream(filename)).on('finish', () => {
                console.timeEnd('getPic');
                //console.log('finish');
                tar.pic = tar.cate_py + '.jpg';
                resolve(tar)
            }).on('error', (error) => {
                console.log(error);
                reject(error)
            })
        })
    }

    //更新pic字段
    async function updPic(tar) {
        return new Promise((resolve, reject) => {
            let now = moment().format('YYYY-MM-DD HH:mm:ss');
            db.query('UPDATE ?? SET pic = ?, update_date=? WHERE id = ?', [table, tar.pic, now, tar.id], (error, results, fields) => {
                if (error) {
                    return reject(error)
                }
                if (results && results.affectedRows) {
                    tar.update_date = now;
                }
                resolve(tar);
            });
        })
    }

    //处理图片尺寸（压缩、裁剪）
    async function fixPic(tar) {
        return new Promise((resolve, reject) => {
            let pic = path.join(crawlerConfig.dir, tar.pic);
            //console.log('tar', tar);
            //console.log('fixPic', pic);

            // sharp(pic).resize(crawlerConfig.size.width, crawlerConfig.size.height)
            //     .toFile(path.join(crawlerConfig.dir, 'hehe-' + tar.pic), (error,info) => {
            //         if (error) {
            //             console.log(error);
            //             return reject(error)
            //         }
            //         console.log('gm done');
            //         resolve(tar);
            //     })

            resolve(tar);
        })
    }

    for (let i = 0; i < tbTarget.length; i++) {
        //console.log('a' + i);
        let row = await getDataLink(tbTarget[i]);
        let step1 = await getUrl(row);
        let step2 = await getPic(step1);
        let step3 = await updPic(step2);
        let step4 = await fixPic(step3);
        pageData.data.push(step4);
        //console.log('b' + i);
    }

    ctx.type = 'application/json; charset=utf-8';
    ctx.body = pageData;

})


module.exports = router;