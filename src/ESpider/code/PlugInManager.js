'use strict'
const UaPool = require('../plugin/UaPool')
const ProxyPool = require('../plugin/ProxyPool')
const CookiePool = require('../plugin/CookiePool')
const HeaderPool = require('../plugin/HeaderPool')


class PlugInManager {
    /**
     * TODO js对象形式非class生成的插件通过创建统一成class实例
     * 插件调用优先级 requestPlugins > localSpiderPlugins > globalPlugin
     * 1.requestPlugins:请求级别插件，对指定某个请求生效,
     * 2.localSpiderPlugins:爬虫级别插件,对整个爬虫的所有请求生效
     * 3.globalPlugin:全局插件，对所有的爬虫都生效
     * */
    plugins = {}   //  用户插件，全局注册，必须按需使用
    globalPlugin = {}    // 用户插件和框架内置插件,无需指定plugin名字使用,全局生效,调用优先级最低
    constructor() {
    }
    static getInstance(){
        if(!this.Instance)  this.Instance = new PlugInManager()
        return this.Instance
    }
    /** 内置的几个插件创建接口 */
    newUaPool(name) {
        name = name.trim()
        this.#checkPoolNameCanUse(name)
        const Pool = new UaPool()
        Pool.setPlugInName(name)
        return Pool
    }
    newCookiePool(name) {
        name = name.trim()
        this.#checkPoolNameCanUse(name)
        const Pool = new CookiePool()
        Pool.setPlugInName(name)
        return Pool
    }
    newHeaderPool(name) {
        name = name.trim()
        this.#checkPoolNameCanUse(name)
        const Pool = new HeaderPool()
        Pool.setPlugInName(name)
        return Pool
    }
    newProxyPool(name) {
        name = name.trim()
        this.#checkPoolNameCanUse(name)
        const Pool = new ProxyPool()
        Pool.setPlugInName(name)
        return Pool
    }
    #checkPoolNameCanUse(name) {   // 检查内置几个插件中的是否已存在
        if (typeof name !== 'string')  throw new Error(name + '请使用string类型名称作为插件名')
        if (this.plugins[name])  throw new Error(name + '已存在')
    }
    static #checkPlugInName(name){  // 用于检查插件指定名称是否合格
        if (!name || typeof name !== 'string') throw new TypeError('插件名字是必须的,请给插件指定一个名字')
    }
    getPlugIn(name,errMessage = '') {
        /** 获取插件名称 包括普通注册的插件合全局插件 */
        if (this.plugins[name.trim()]) return this.plugins[name]
        else if (this.globalPlugin[name.trim()]) return this.globalPlugin[name]
        else  throw new Error(errMessage + ' : ' + name +　'插件不存在')
    }
    use = (plugin,globalValidation=false) => {
        /** 通过该方法进行全局注册,全局或局部使用生效,局部生效可用于单个spider生效或者局部单个请求,做到精细化控制
         * 所有插件都是全局注册，唯一区别就是生效范围不一样
         * requestPlugins:请求级别插件，对指定某个请求生效,
         * localSpiderPlugins:爬虫级别插件,对整个爬虫的所有请求生效
         * globalPlugin:全局插件，对所有的爬虫都生效
         *  @param  {Object} plugin 一个类 或 类的实例 或者 一个object对象 或一个包含前两种类型的数组 包含指定 插件特定函数
         *  @param  {Boolean} global  是否为全局生效
         *  @return {PlugInManager} 返回插件管理器
         * */
        let plugins= []
        Array.isArray(plugin) ? plugins = plugin : plugins.push(plugin)
        plugins.forEach((val)=>{
            if (typeof val !== 'function' && typeof val !== 'object')  throw new TypeError('请传入符合指定标准的插件')
            if (typeof val === 'function') val = new val()
            PlugInManager.#checkPlugInName(val.name)
            if (this.plugins[val.name] && this.globalPlugin[val.name]){
                throw new Error('PluginExistError : 插件' + val.name + '已存在')
            }else {
                if (!globalValidation) this.plugins[val.name] = val
                else this.globalPlugin[val.name] = val
            }
        })
        return this
    }

    traversalInterceptorList= async (processFunctionName,args) => {
        /** 用于遍历运行插件指定函数 比如插件中的 request , response
         * @param  {String} pluginFunctionName 插件指定的函数名,事件驱动后执行任务名称所指定
         * @param  {Array} args 用于传给指定插件函数的变量
         * */
        if (['created','request','response','errback'].includes(processFunctionName)){
            let plugins = []
            const request = args.response ? args.response.request  : args.request
            const requestPlugins = (!request || !request.plugins)? [] : request.plugins
            if (requestPlugins === null || requestPlugins === false || requestPlugins === []) return   // null 或者 false 表示不启动任何插件
            let callbackData
            if (processFunctionName === 'errback') callbackData =  args.err
            else callbackData = args.response? args.response : args.request
            const localSpiderPlugins = !args.spider.plugins ? [] : args.spider.plugins
            // 下方代码找爬虫级生效插件并合并,优先级: 请求级 > 爬虫级 > 全局插件
            plugins = requestPlugins.concat(localSpiderPlugins.filter((val)=>!requestPlugins.includes(val)))
            const globalPlugin = Object.keys(this.globalPlugin)
            //  找全局插件合并
            plugins = plugins.concat(globalPlugin.filter((val)=>!plugins.includes(val)))
            for (let index in plugins) {
                let pluginName = plugins[index]
                if (!this.getPlugIn(pluginName,args.spider.name)[processFunctionName]) continue
                await (this.getPlugIn(pluginName)[processFunctionName].apply(this.getPlugIn(pluginName),[callbackData,args.spider]))
            }
        }else {
            // 系统工作过程触发事件,属于每个爬虫有操作一次性执行,同步执行会会阻塞当前爬虫,不影响其他爬虫
            const localSpiderPlugins = !args.spider.plugins ? [] : args.spider.plugins
            const globalPlugin = Object.keys(this.globalPlugin)
            let plugins = localSpiderPlugins.concat(globalPlugin.filter((val)=>!localSpiderPlugins.includes(val)))
            for (let index in plugins) {
                let pluginName = plugins[index]
                if (!this.getPlugIn(pluginName)[processFunctionName]) continue
                await this.getPlugIn(pluginName)[processFunctionName].apply(this.getPlugIn(pluginName),Object.values(args))
            }
        }
    }
}

module.exports = PlugInManager
