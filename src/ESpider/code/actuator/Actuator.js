const {Request} = require('../../Request')
const {ESpiderQueueManager,Queue} = require("../../Queue")

const PlugIn =  require('../PlugInManager').getInstance()
const emitter = require("../../EventEmitter").getInstance()
const downloader = require('../Downloader')
class Actuator {
    queueManager = ESpiderQueueManager.getInstance()
    #requestTimers = {}
    #pendingRequestRecords = {}    //  用于插件运行时监听是否运行完毕，只有一个值statistics用于统计当前运行的插件函数个数
    constructor() {
        this.#eventServer().then()
    }
    static getInstance(){
        if(!this.instance) this.instance = new Actuator()
        return this.instance
    }
    sleep = async (ms) => {
        await new Promise(resolve => setTimeout(resolve, ms))
    }
    #startRequest(spider){
        const requestQueue = this.getRequestQueue(spider.name)
        const addRequest = ()=>{
            if(!requestQueue.empty()){
                if (spider.maxConnections > 0) {  //  控制最大并发
                    if (spider.CRAWLER_STATUS.connecting >= spider.maxConnections ) return
                }
                const request= requestQueue.pop()
                this.emit('request',request,spider)
                if(requestQueue.empty()) this.emit('spiderEmpty',spider)
            }
        }
        const startRequest = ()=>{
            clearInterval(this.#requestTimers[spider.name])
            addRequest()
            this.#requestTimers[spider.name] = setInterval(addRequest,spider.delay)
        }
        startRequest()
    }
    #executeEventTask = async (spider) =>{
        /**  用于执行调度的核心代码，执行事件任务队列里面的任务和请求任务  */
        if (spider.status === 'crawling') return
        const eventQueue = this.getEventQueue(spider.name)
        const requestQueue = this.getRequestQueue(spider.name)
        let delayCloseTime = spider.delayCloseTime
        let isClosed = false
        let spiderEvent = null
        while (spider.status !== 'closed' || !isClosed ){
            const isEventQueueEmpty = eventQueue.empty()
            // console.log(isEventQueueEmpty,spider.CRAWLER_STATUS.connecting,this.#pendingRequestRecords[spider.name].statistics );
            if (isEventQueueEmpty){
                if (spider.status !== 'closed' && !requestQueue.empty()){
                    delayCloseTime = spider.delayCloseTime
                }else if( spider.CRAWLER_STATUS.connecting <= 0
                    &&this.#pendingRequestRecords[spider.name].statistics === 0
                    &&eventQueue.empty()){
                    if (spiderEvent !== null) delayCloseTime = 0
                    if (delayCloseTime > 0) {
                        delayCloseTime-=100
                        console.log(delayCloseTime);
                    }else if(delayCloseTime <= 0){
                        // console.log('进来closed判断了',delayCloseTime,isClosed,spider.status );
                        if (spider.status !== 'closed'
                            && spider.status !== 'ready'){
                            this.close(spider)
                        }else if(spider.status === 'closed'){
                            await this.eventActuator(spiderEvent,spider)
                            break
                        }
                    }
                }
                await this.sleep(100)    //  事件队列空时延时再次检测
            }else if(!isEventQueueEmpty){
                let event = eventQueue.pop()
                if (event === null) continue
                delayCloseTime = spider.delayCloseTime
                if (['request','response','created','errback'].includes(event.name)){
                    this.eventActuator(event,spider).then()
                }else if (event.name === 'spiderClose'){
                    if (eventQueue.empty()
                        && spider.status === 'closed'
                        && spider.CRAWLER_STATUS.connecting <= 0
                        && this.#pendingRequestRecords[spider.name].statistics === 0){
                        if (spiderEvent === null) spiderEvent = event
                        await this.eventActuator(spiderEvent,spider)
                        isClosed =true
                    }else {
                        spiderEvent = event
                    }
                }else {
                    await this.eventActuator(event,spider)
                }
            }
        }
    }
    crawl(spider){
        if (spider.status !=='ready') return false
        this.#createQueue(spider)
        this.#pendingRequestRecords[spider.name]={ statistics: 0 }
        this.#executeEventTask(spider).then()
        this.#startRequest(spider)
        this.emit('spiderOpen',spider)
        spider.status = 'crawling'
        if (spider.start) spider.start()
        else { new Error('start入口函数是必须的')  }

    }
    pause(spider){
        if (spider.status !=='crawling' ) return false
        clearInterval(this.#requestTimers[spider.name])
        this.emit('spiderPause',spider)
        spider.status = 'paused'
    }
    continue(spider){
        if (spider.status !=='paused') return false
        this.#startRequest(spider)
        this.emit('spiderContinue',spider)
        spider.status = 'crawling'
    }
    close(spider){
        if (spider.status ==='closed' || spider.status ==='ready') return false
        clearInterval(this.#requestTimers[spider.name])
        this.emit('spiderClose',spider)
        spider.status = 'closed'
    }
    on = (eventName,callback)=> {
        emitter.on(eventName,callback)
    }
    emit = (...args)=>{
        emitter.emit.apply(emitter,args)
    }
    getEventQueue(spiderName){
        // console.log(spiderName);
        return this.queueManager.getQueue(spiderName).eventQueue
    }
    getRequestQueue(spiderName){
        return this.queueManager.getQueue(spiderName).requestQueue
    }
    #eventServer = async () => {
        /**
         * ESpider事件执行优先级,同级不分先后
         * level    eventName
         *   1.     spiderOpen,spiderPause,spiderContinue,spiderEmpty
         *   2.     request
         *   3.     created,response,errback
         *   4.     spiderClose
         *   */
        //  created 用户自定义请求创建后
        this.on('created', (request,spider)=> this.getEventQueue(spider.name).queue({name:'created',arg:{request,spider}},3))
        //  request 下载器执行下载前
        this.on('request', (request,spider)=> this.getEventQueue(spider.name).queue({name:'request',arg:{request,spider}},2))
        //  response 下载器下载完成后返回结果 // downloadSuccess
        this.on('response', (response,spider)=> this.getEventQueue(spider.name).queue({name:'response',arg:{response,spider}},3))
        //  errback   出错调用  // downloadFailed
        this.on('errback', (err,spider)=> this.getEventQueue(spider.name).queue({name:'errback',arg:{err,spider}},3))
        //  spiderOpen  爬虫启动
        this.on('spiderOpen', (spider) =>  this.getEventQueue(spider.name).queue({name:'spiderOpen',arg:{spider}},1))
        //  下面四个[spiderPause,spiderContinue,spiderClose,spiderEmpty]  发起信号后,已经发起的请求会继续执行不会受影响
        this.on('spiderClose', (spider) =>  this.getEventQueue(spider.name).queue({name:'spiderClose',arg:{spider}},4) )
        this.on('spiderPause', (spider) =>  this.getEventQueue(spider.name).queue({name:'spiderPause',arg:{spider}},1))
        this.on('spiderContinue', (spider) => this.getEventQueue(spider.name).queue({name:'spiderContinue',arg:{spider}},1))
        // spiderEmpty立即执行以随时获取新的请求,另外此处若使用addEventQueue的话，会使队列一直不为空,导致无限循环提示Empty
        this.on('spiderEmpty', (spider) =>  this.getEventQueue(spider.name).queue({name:'spiderEmpty',arg:{spider}},1))
    }


    eventActuator = async (event) => {
        // console.time(event.name)
        // console.log(event.arg.spider.CRAWLER_STATUS);
        // console.log('eventNext',event.name);
        // console.log('eventNext',event.name,this.getEventQueue(event.arg.spider.name).getQueueList());
        this.#pendingRequestRecords[event.arg.spider.name].statistics++
        if (['created','request','response','errback'].includes(event.name)){
            await this.#doTraversalAfterActuator(event)
        }else await this.#doTraversalBeforeActuator(event)
        this.#pendingRequestRecords[event.arg.spider.name].statistics--
        // console.timeEnd(event.name)
    }
    #createQueue(spider){
        this.queueManager.newESpiderQueue(spider.name,{
            eventQueue: new Queue(4),
            requestQueue: new Queue(spider.maxPriority).setMaxQueue(spider.maxQueue)
        })
    }
    #doTraversalBeforeActuator =  async (event)=>{
        let name = event.name, arg = event.arg,isTraversalPlugIn = true,spider=arg.spider
        switch (name) {
            // case 'spiderOpen': { console.log('爬虫开启'); } break
            // case 'spiderEmpty':{  console.log('事件队列已空') }break
            // case 'spiderPause':{ console.log('爬虫暂停') }break
            // case 'spiderContinue':{  console.log('爬虫继续') }break
            // case 'spiderClose':{  console.log('爬虫结束') }break
        }
        if (isTraversalPlugIn) await PlugIn.traversalInterceptorList(name,arg)
        // console.time(name)
        // await this.sleep(2000)
        // await this.sleep(1000)
        // console.timeEnd(name)
    }
    #doTraversalAfterActuator = async (event)=>{
        let name = event.name, arg = event.arg,isTraversalPlugIn = true,spider=arg.spider
        if (isTraversalPlugIn) await PlugIn.traversalInterceptorList(name,arg)
        // await this.sleep(1000)
        // await this.sleep(1000)
        // console.log('进来了',event.name);
        switch (name) {
            case 'created':{
                spider.CRAWLER_STATUS.total++
                this.getRequestQueue(spider.name).queue(new Request(arg.request))
            } break
            case 'request':{
                downloader.getInstance().doRequest(arg.request)
                if(arg.request.discard) {
                    spider.CRAWLER_STATUS.discard++  // 放弃本次请求
                    break
                }else if(arg.request.direct)  spider.CRAWLER_STATUS.total++
                spider.CRAWLER_STATUS.connecting++
            }break
            case 'response':{
                // console.log(spider);
                spider.CRAWLER_STATUS.completed++
                spider.CRAWLER_STATUS.connecting--
                if (arg.response.request.callback && spider[arg.response.request.callback.name]){
                    await arg.response.request.callback.call(spider,arg.response)
                }else {
                    await spider.page(arg.response)   // callback默认调用page函数
                }

            }break
            case 'errback':{
                spider.CRAWLER_STATUS.connecting--
                spider.CRAWLER_STATUS.errors++
                if (arg.err.request.errback && spider[arg.err.request.errback.name]){
                    await arg.err.request.errback.call(spider,arg.err)
                }else {
                    await spider.errback(arg.err)   // errback默认调用errback函数
                }
            }break
        }
    }

}


module.exports = Actuator





