'use strict';

var router = require('koa-router')();

router.get('/', async function(ctx, next) {
    ctx.state = {
        title: '菜谱首页',
        page: 'caipu'
    };
    ctx.body = 'this a caipu/index response!';
    await ctx.render('caipu/index', {});
});

router.get('/:id' + '.html', async function(ctx, next) {
    //热数据，读静态html
    ctx.state = {
        title: '菜谱详情' + ctx.params.id,
        page: 'caipu'
    };
    await ctx.render('caipu/detail', {});
});

module.exports = router;
