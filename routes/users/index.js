'use strict';

var router = require('koa-router')();

router.get('/', async function(ctx, next) {
    ctx.state = {
        title: '用户首页',
        page: 'users'
    };
    ctx.body = 'this a users response!';
    await ctx.render('users/index', {});
});

module.exports = router;