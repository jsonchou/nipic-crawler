# nipic-crawler

nipic分类图片采集、裁剪、去水印

## 场景

* 100条分类需要添加图片，我们只需要手动修改DB 100次即可。

## 问题

* 10000条分类，手动修改太残酷

## 解决问题

* 数据采集图片、裁剪、去水印

## 技术实施方案
* mariadb
* nipic.com（昵图网）
* koa2
* async/await + bluebird