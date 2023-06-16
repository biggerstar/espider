'use strict'

const logging = require('log4js').getLogger('eSpider')
const emitter = require('./EventEmitter').getInstance()


logging.level = 'debug'


class Items{
    items = {}
    constructor(item) {
        Object.assign(this,item)
    }
    itemFactory(item){

    }
}

class Spider{
    name = null
    delay = 0          //  可动态调整调度器调度速度
    delayCloseTime = 0     // 爬取完毕延迟关闭时间，等待可能的新任务
    status = 'ready'    //  ready ; crawling ; paused ; closed ;
    CRAWLER_STATUS = {    //  爬虫当前运行状态,CRAWLER_STATUS只读，属性可写
        total : 0 ,     //  全部请求数
        connecting : 0,     //  正在连接的个数
        completed : 0,     //  已经完成个数
        discard : 0,     //   放弃请求的请求个数
        errors : 0,       //   错误个数
    }
    maxQueue = -1    //  执行器最大队列  -1 为不限制
    maxConnections = -1   //  自身spider最大并发
    maxPriority = 10   //  该Spider的最大优先级  优先级数越小优先级越大
    result = {}
    mergeResult = {}
    constructor(spiderConstruction) {
        Object.defineProperties(this,{
            CRAWLER_STATUS:{ writable:false, configurable:true}
        })
        Object.assign(this,spiderConstruction)
    }

    start(){}
    page(){}
    item(){}
    get = (option) => {
        option.method = 'get'
        this.#request(option)
    }
    post = (option) => {
        option.method = 'post'
        this.#request(option)
    }
    put = (option) => {
        option.method = 'put'
        this.#request(option)
    }
    delete = (option) => {
        option.method = 'delete'
        this.#request(option)
    }
    socket(){}
    // axios = ()=>{ }
    direct(option){
        /** 不通过调度器不使用插件直接发送请求*/
        option.__belongFromSpiderName = this.name
        option.direct = true
        emitter.emit('request',option,this)
    }
    session = () => {
        // const session = new this.Session()
    }
    #request(option){
        option.__belongFromSpiderName = this.name
        emitter.emit('created',option,this)
    }
    merge(filedName,data){
        if (!this.mergeResult[filedName]) this.mergeResult[filedName] = []
        console.log(data);
        this.mergeResult[filedName].push(data)
    }
    getItems(){
        let resultDict = this.mergeResult
        let result = []
        const everyAttr = {}
        for (let rk in resultDict) {
            const filedName = rk
            const data = resultDict[rk]
            if (data.length === 1) {
                everyAttr[rk] = data
            }
            if (Array.isArray(data)){
                data.forEach((dataField,index)=>{
                    if (!result[index]) result[index] = {}
                    // console.log(dataField);
                    result[index][filedName] = dataField
                })
            }
        }
        // console.log(everyAttr);
        result = result.map(item=>{
            for (let ek in everyAttr) {
                let data = ''
                const val = everyAttr[ek]
                if (Array.isArray(val) && val.length === 1){
                    data = val[0]
                }else data  =val
                if (typeof data  === 'string') data = data.replace(/\n*/,'').replace(/\t*/,'')
                item[ek] = data
            }
            return item
        })
        //
        // result = JSON.stringify(result)
        // result = JSON.parse(result)
        return result
    }
}





module.exports= Spider









