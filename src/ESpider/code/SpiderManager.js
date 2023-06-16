'use strict'

class SpiderManager {
    /**   ActuatorsManager是单例，不设运行状态,有爬虫管理器在执行就是运行中，如果所有爬虫执行器都运行完成或未在运行，爬虫管理器就是关闭状态   */
    spiders = {}     //  所有的爬虫
    totalSpider = 0
    constructor() {
        // console.log('SpiderManager实例化');
    }
    static getInstance(){
        if(!this.instance) this.instance = new SpiderManager()
        return this.instance
    }
    getReadySpiders(){ return this.#getGroupFromStatus('ready')}
    getCrawlingSpiders(){ return this.#getGroupFromStatus('crawling')}
    getPausedSpiders(){ return this.#getGroupFromStatus('paused')}
    getClosedSpiders(){ return this.#getGroupFromStatus('closed')}

    /**  以下 crawl,pause,continue,close 不传参默认执行控制全部爬虫,已经是当前状态的爬虫会跳过 */
    crawl(spiderInfo){  this.#evalEventForAllSpider('crawl',spiderInfo) }
    pause(spiderInfo){  this.#evalEventForAllSpider('pause',spiderInfo) }
    continue(spiderInfo){  this.#evalEventForAllSpider('continue',spiderInfo) }
    close(spiderInfo){
        this.#evalEventForAllSpider('close',spiderInfo)
        this.totalSpider = 0
    }
    getSpider(spiderName){
        /**
         * @param {String} spiderName  爬虫名
         * @return  {SpiderActuator}  爬虫执行器实例
         * */
        return this.spiders[spiderName]
    }
    addSpiders(SpiderArray){
        /** 用于批量添加爬虫
         *  @param {Array} SpiderArray  包含用户写的爬虫数组, 格式为 [{spider: Spider,args:args},...]
         *                              spider 和 arg 请介绍参考本类 addSpider
         * */
        if (Array.isArray(SpiderArray)){  SpiderArray.forEach((val)=> this.addSpider(val.spider,val.args))
        }else {    throw new Error('addSpiders: 请传入一个包含spider信息的数组,格式为 [{spider: Spider,args:args},...]')  }

    }
    addSpider(Spider,args){
        /**
         * @param {Object} Spider   用户自定义的爬虫类,或用户自定义符合标准的爬虫js对象Object
         * @param {any} args    args是用户在外部创建时预先准备可以给的爬虫实例使用的数据,会依附在 spider.args中
         * @return {Object}  spider实例
         * */
        let spider = Spider
        if (Array.isArray(Spider)) throw Error('addSpider: spider应该是一个类或者js对象,您若要使用批量添加爬虫,请使用addSpiders方法')
        if (typeof Spider === 'function' && Spider.toString().slice(0,10).includes('class')) {
            spider = new Spider()
        }
        this.totalSpider++
        if (args !== undefined) spider.args = args
        if (spider.name === undefined|| spider.name === null) spider.name = 'defaultSpider' + (this.totalSpider)
        if (this.spiders[spider.name] === undefined){
            return this.spiders[spider.name] =  spider
        }else {
            throw Error('SpiderExist:' + spider.name + '已存在，请不要重复创建同名爬虫')
        }
    }
    #getGroupFromStatus(statusText){
        /**  获取当前指定状态的爬虫执行器列表
         * @param  {String} statusText   ready ; crawling ; paused ; closed ;
         * @return {Array}  指定状态的爬虫执行器列表
         * */
        return Object.values(this.spiders).filter((val)=>val.status === statusText)
    }
    #evalEventForAllSpider(actuatorEventName,spiderInfo){
        /** 执行指定爬虫操作
         * @param {string} actuatorEventName   爬虫操作  crawl，pause，continue，close 等等
         * @param {any} spiderInfo  要操作的爬虫相关信息，可以是爬虫名称(string) ，或者 spider实例(object)，
         *                          或者直接不传任何参数代表，此时会全部关闭所有爬虫
         * */
        const Actuator = require('./actuator/Actuator').getInstance()
        if (spiderInfo === undefined){   // 操作所有爬虫
            const spiders = Object.values(this.spiders)
            if (spiders.length <= 0)  throw new Error('当前爬虫任务为空,请添加爬虫')
            spiders.forEach((spider)=>Actuator[actuatorEventName].call(Actuator,spider))
            return true
        }
        if(typeof spiderInfo === 'string'){  // 传入的是一个爬虫名字
            const spider = this.getSpider(spiderInfo)
            if (spider === undefined) throw new Error('SpiderNoExist找不到'+spiderInfo + '对应的爬虫')
            Actuator[actuatorEventName].call(Actuator,spider)
        }else if(typeof spiderInfo === 'object' || typeof spiderInfo === 'function'){  // 传入的是一个爬虫实例
            const spider = this.addSpider(spiderInfo)
            if (typeof spider.name !== 'string') throw new Error('传入的不是一个正确的爬虫,请传入爬虫名或者爬虫实例')
            Actuator[actuatorEventName].call(Actuator,this.getSpider(spider.name))
        }

    }
}

module.exports = {
    SpiderManager
}





