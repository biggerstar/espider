module.exports = {
    // 允许的http状态码，是一个数组
    allowHttpCodeList : ['*'],
    // 默认使用的Pool名称列表
    defaultUsePluginName : ['UaPool','ProxyPool','CookiePool','HeaderPool','MiddlewarePool'],
    // 用于存取用户注册的插件，是一个对象数组
    // defaultUsePlugin:[],
    customPlugin : [],
    // 是否重试  false 为不重试；  true 为重试一次 ； 数字为重试指定次数
    retries:true,
    // 爬虫执行完毕延迟关闭时间
    delayCloseTime:0,
    //  最大优先级  优先级数越小优先级越大
    maxPriority:0,
    //  执行器最大队列  -1 为不限制
    maxQueue:0,
    //  自身spider最大并发
    maxConnections:0,
    // 发起请求的间隔时间
    delay:0,
}
