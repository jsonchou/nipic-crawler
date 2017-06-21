'use strict';

//全局参数
let g = {
    domain: 'www.demo.com',
    cdn: 'cdn.demo.com',
}
const db = {
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    connectionLimit: 2,
    password: 'amwewihcv',
    database: 'test'
}

let development = {
    env: 'development', //环境名称
    port: 900, //服务端口号
    mongodb_url: '', //数据库地址
    redis_url: '', //redis地址
    redis_port: '' //redis端口号
};

let production = {
    env: 'production', //环境名称
    port: 80, //服务端口号
    mongodb_url: '', //数据库地址
    redis_url: '', //redis地址
    redis_port: '' //redis端口号
};

let env = process.env.NODE_ENV || 'development';

module.exports = Object.assign({}, { g }, { db }, {
    development,
    production
}[process.env.NODE_ENV || 'development'])