const ESpider = require('./ESpider/ESpider')

// User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36

ESpider.use([
    require('./plugins/ua').pool1,
    require('./plugins/headers').HeadersPool,
    require('./plugins/cookie').cookiePool1,
    // require('./plugins/proxy').ProxyPool1,
    // require('./plugins/other'),
])
// ESpider.use(require('./plugins/proxy').ProxyPool1,true)

/**   代理池spiderClose 跟随关闭在多个spider会失效 ，需要 多加 执行器开启和关闭事件 */

// console.log(ESpider.plugInManager);

// crawler.on

// JSpider.setting({
//     retries: true,
//     delay:100    // 强制变成单线程
//     direct:true, // 用在spider实例中  直接发起请求
// })
// ESpider.addSpider(require('./spider/spider'))
// ESpider.addSpiders([
//     { spider:require('./spider/spider')  }
//     // { spider:require('./spider/spider')  },
// ])
// ESpider.downloader.doRequest = (request)=>{
//     ESpider.downloader.downloadSuccess(request,{a:1,b:2} )
//     // console.log('downloader',arguments);
// }

// 冒泡算法

// ESpider.crawl('Student1')
// ESpider.crawl(require('./spider/spider'))
// ESpider.crawl(require('./spider/spider'))
ESpider.crawl( require('./spider/3.获取学校校园风光图片链接') )
// ESpider.crawl( require('./spider/spider') )
// ESpider.crawl( require('./spider/spider') )
ESpider.crawl()

// console.log(ESpider.plugInManager.plugins.ESpiderTimeout.request);


setTimeout(()=>{
    // console.log(JSON.parse(JSON.stringify(ESpider.spiderManager.getSpider('defaultSpider1'))));
    // console.log(ESpider.spiderManager.getSpider('defaultSpider1'))
    // console.log(ESpider.spiderManager.spiders);
    // ESpider.spiderManager.close('defaultSpider1')
    // ESpider.spiderManager.close( )

    // ####################################
    // console.log('开始执行定时爬虫控制');
    // ESpider.pause('defaultSpider1')
    // console.log('defaultSpider1暂停');
    // setTimeout(()=>{
    //     ESpider.pause('defaultSpider2')
    //     console.log('defaultSpider2暂停');
    //     setTimeout(()=>{
    //         ESpider.continue('defaultSpider1')
    //         console.log('defaultSpider1执行继续');
    //         ESpider.close('defaultSpider2')
    //     },3000)
    //     setTimeout(()=>{
    //         ESpider.continue('defaultSpider2')
    //         console.log('defaultSpider2执行继续');
    //     },12000)
    // },5000)
},1000)

// const {customPlugin} = require('./ESpider/defaultConfig')










