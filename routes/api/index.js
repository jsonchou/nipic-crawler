'use strict';

const fs = require("fs");
const path = require('path');
const http = require("http");

const request = require("request");
const cheerio = require("cheerio");

let router = require('koa-router')();

const moment = require('moment');
const mysql = require('mysql');
const db = mysql.createConnection(config.db);

const size = 40; //40 60 100

const crawlerConfig = {
    table: 'material',
    tmpl: `http://soso.nipic.com/?q={{keyword}}&k=2&f=JPG&g=1&y=${size}&w=0&h=0&page=1`,
    dir: "D://Projects//www.jsoncdn.com//cdn//chi//material",
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

//ajax api
router.get('/', async(ctx, next) => {

    let table = crawlerConfig.table;

    let pageData = {
        code: 200,
        message: 'success',
        data: []
    }

    async function getAllTable() {
        return new Promise((resolve, reject) => {
            db.query("SELECT * from ?? where pic_url is null order by id desc ", [table], (error, results, fields) => {
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
router.get('/cut', async(ctx, next) => {

    let table = crawlerConfig.table;
    let id = ctx.query.id;
    let ids = ctx.query.ids;

    let pageData = {
        code: 200,
        message: 'success',
        data: []
    }

    console.log(id);
    console.log(ids);

    //get db data;
    async function getData() {
        return new Promise((resolve, reject) => {
            db.query("SELECT * from ??  where id " + (id ? " = ? " : " in (?) ") + " order by id desc ", id ? [table, id] : [table, ids.split(',')], (error, results, fields) => {
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
        // let name_other = tar.name_other ? tar.name_other.split('、')[3] : '';
        // let url = crawlerConfig.tmpl.replace("{{keyword}}", encodeURIComponent(name_other || tar.name));

        let url = crawlerConfig.tmpl.replace("{{keyword}}", encodeURIComponent(tar.name));

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
                let rdx;
                if (pageLinkLens.length >= size) {
                    rdx = Math.floor(Math.random() * pageLinkLens - 1) //下一页占用一个box 
                } else {
                    rdx = Math.floor(Math.random() * pageLinkLens)
                }
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
                uri: tar.pageLink,
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

    //获取图片  use system api
    async function getPic(tar) {
        return new Promise((resolve, reject) => {
            let filename = path.join(crawlerConfig.dir, tar.name_py + '.jpg');
            let file = fs.createWriteStream(filename);
            var sendReq = request.get(tar.imgSrc);

            // verify response code
            sendReq.on('response', function(response) {
                if (response.statusCode !== 200) {
                    console.log(response);
                    return reject(response)
                }
            });

            // check for request errors
            sendReq.on('error', function(error) {
                fs.unlink(filename);
                console.log(error);
                return reject(error)
            });

            sendReq.pipe(file);

            file.on('finish', function() {
                file.close(() => {

                }); // close() is async, call cb after close completes.
                tar.pic_url = tar.name_py + '.jpg';
                resolve(tar);
            });

            file.on('error', function(error) { // Handle errors
                try {
                    fs.unlink(filename); // Delete the file async. (But we don't check the result)
                } catch (cerr) {
                    throw new cerr;
                }

                console.log(error);
                return reject(error)
            });
        })
    }

    //更新pic字段
    async function updPic(tar) {
        return new Promise((resolve, reject) => {
            let now = moment().format('YYYY-MM-DD HH:mm:ss');
            db.query('UPDATE ?? SET pic_url = ?, update_date=? WHERE id = ?', [table, tar.pic_url, now, tar.id], (error, results, fields) => {
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
            let pic = path.join(crawlerConfig.dir, tar.pic_url);
            //console.log('tar', tar);
            //console.log('fixPic', pic);

            // sharp(pic).resize(crawlerConfig.size.width, crawlerConfig.size.height)
            //     .toFile(path.join(crawlerConfig.dir, 'hehe-' + tar.pic_url), (error,info) => {
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
        if (row.pageLink) {
            let step1 = await getUrl(row);
            try {
                let step2 = await getPic(step1);
                let step3 = await updPic(step2);
                let step4 = await fixPic(step3);
                pageData.data.push(step4);
            } catch (error) {
                throw new error;
            }
        }
        //console.log('b' + i);
    }

    ctx.type = 'application/json; charset=utf-8';
    ctx.body = pageData;

})


module.exports = router;