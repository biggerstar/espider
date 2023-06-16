'use strict'
const axios = require('axios')
const emitter = require('../EventEmitter').getInstance()
const {Response} = require('../Response')
const {allowHttpCodeList} = require('../defaultConfig')
const spiderManager = require('./SpiderManager').SpiderManager.getInstance()

class Downloader{
    /** 下载器默认使用axios进行请求, 可继承修改或替换doRequest方法实现下载器更换 */
    constructor() { }
    static getInstance(){
        if(!this.instance) this.instance = new Downloader()
        return this.instance
    }
    downloadSuccess(request,data){
        /**
         * @param {Object} request  用户发起的请求配置信息
         * @param {any}  data   用户自定义下载器最终返回到request.callback指定回调函数的数据，会依附在response.data下
         * */
        if (arguments.length < 2) throw new Error('downloadSuccess:请传入doRequest形参request,' +
            '和您要返回到回调函数的data,默认返回到回调函数的格式为 { request:request, data:data })')
        const response = {
            request:request,
            data:data
        }
        emitter.emit('response',response, spiderManager.getSpider(request.__belongFromSpiderName))
    }
    downloadFailed(request,err){
        /**
         * @param {Object} request  用户发起的请求配置信息
         * @param {any}  err   用户自定义下载器最终返回错误的数据,若启用插件可用于插件内自定义处理,会依附在response.data下
         * */
        if (arguments.length < 2) throw new Error('downloadFailed:请传入doRequest形参request,' +
            '和您要返回或能给插件处理的错误数据信息,默认返回插件处理的格式为 { request:request, data:err })')
        const response = {
            request:request,
            data:err
        }
        emitter.emit('errback',response, spiderManager.getSpider(request.__belongFromSpiderName))
    }
    doRequest = (request) =>{
        // console.log('doAxiosRequest',request);
        /** 下载器请求发送入口，可通过该方法进行覆盖重写下载器，实现更换下载方式 */
        this.#doAxiosRequest(request).then(r => {})
    }
    #doAxiosRequest = async (request)=> {
        /**  默认下载器下载方式 Axios */
        if(!request){ return }
        let axiosResponse
        try {
            // console.log('doRequest');
            if (request.method.toLowerCase() === 'get')  axiosResponse = await axios.get(request.url,request)
            else   axiosResponse = await axios(request)
            this.axiosDownloadSuccess(request,axiosResponse)
        }catch (err) {
            // console.log('axios部分捕捉到异常');
            // console.log('errMessage:',err.message)
            if (typeof err.message=== 'string' && err.message.includes('Request failed with status ESpider')){
                let statusCode = err.message.replace('Request failed with status ESpider ','')
                if (allowHttpCodeList.includes('*') || allowHttpCodeList.includes(parseInt(statusCode))) {
                    this.axiosDownloadSuccess(request,err.response)
                }
                else this.axiosDownloadFailed(request,err)
            }else { this.axiosDownloadFailed(request,err) }
        }

    }
    axiosDownloadSuccess(request, response){
        // console.log(response);
        emitter.emit('response',new Response(request,response), spiderManager.getSpider(request.__belongFromSpiderName))
    }
    axiosDownloadFailed(request, err){
        // console.log('__belongFromSpiderName', spiderManager.spiders);
        emitter.emit('errback',new Response(request,err), spiderManager.getSpider(request.__belongFromSpiderName))
    }
}

module.exports = Downloader
