"use strict"

module.exports = function() {
    return async function(ctx, next) {
        await next();
        //console.log(ctx.request);
        //console.log(ctx.response);
    }
}