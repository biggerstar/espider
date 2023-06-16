const router = require('koa-router')();
const axios = require('axios')

// const request = async (option={})=> { await axios({}) }


// 代理get请求

router.get('/proxy',async ctx => {

    const query = ctx.request.query
    if (query && query['from_source']){
        const client_host = query['client_host']
        let fullUrl = query['from_source']
        delete query['from_source']
        delete query['client_host']
        const urlQueryList = []
        for (let fk in query) {
            urlQueryList.push(fk + '=' + query[fk])
        }
        const fromSourceUrlInfo =  new URL(fullUrl)
        // console.log(fromSourceUrlInfo);
        // fromSourceUrlInfo.host +
        const option = {
            method:'get',
            url: fromSourceUrlInfo.origin + fromSourceUrlInfo.port + fromSourceUrlInfo.pathname + urlQueryList.join('&') ,
            headers:ctx.request.headers,
            timeout:12000
        }

        const headers= option.headers
        // delete option.headers['user-agent']
        delete headers['content-length']
        delete headers['host']
        delete headers['origin']
        for (let hk in headers) {
            if (hk.includes('sec')){
                delete headers[hk]
            }
        }
        // console.log(option);
        try {
            const {data:res} = await axios(option)

            // ctx.set({'X-Frame-Options': 'SAMEORIGIN'})
            ctx.set({'Content-Security-Policy': `frame-ancestors ${client_host}`})
            ctx.set({'Access-Control-Allow-Origin': '*'})
            ctx.body = res
        }catch (err) {
            ctx.body = err.message + '资源请求失败:' + ctx.request.query['from_source']
        }
    }else {
        ctx.body = '未找到需要进行代理请求的url'
    }
})

router.post('/proxy',async ctx => {
    // console.log(ctx.request);

})

// axios({
//     method: 'get',
//     url: 'https://www.baidu.com',
//     headers: {
//         accept: '*/*',
//         'accept-encoding': 'gzip, deflate, br',
//         'accept-language': 'zh-CN',
//         connection: 'keep-alive',
//         'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)Chrome/100.0.4896.127 Safari/537.36',
//         'content-type': 'text/html'
//         },
//         timeout: 12000
//     }
// ).then(res=>{
//     console.log(res.data);
// })

module.exports = router
