var path = require('path');

//日志根目录
var basePath = path.resolve(__dirname, '../.logs')

//错误日志输出完整路径
var errPath = basePath + "/error/error";

//响应日志输出完整路径
var infoPath = basePath + "/info/info";

module.exports = {
    "appenders": [{
            //错误日志
            "category": "errorLogger", //logger名称
            "type": "dateFile", //日志类型
            "filename": errPath, //日志输出位置
            "alwaysIncludePattern": true, //是否总是有后缀名
            "pattern": "-yyyy-MM-dd.log" //后缀，每小时创建一个新的日志文件
        },
        {
            //响应日志
            "category": "infoLogger",
            "type": "dateFile",
            "filename": infoPath,
            "alwaysIncludePattern": true,
            "pattern": "-yyyy-MM-dd.log"
        }
    ],
    "levels": {
        //设置logger名称对应的的日志等级
        "errorLogger": "ERROR",
        "infoLogger": "ALL"
    },
    "baseLogPath": basePath
}