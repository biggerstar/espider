'use strict'

/**
 * connectCode 常见状态
 * ECONNABORTED：“software caused connection abort”，即“软件引起的连接中止”
 * ECONNRESET：“connection reset by peer”，即“对方复位连接”
 * ETIMEDOUT：“connect time out”，即“连接超时”
 * EPIPE：“broken pipe”，即“管道破裂”
 * */
class Response{
    /**  TODO 将 $ 替换source用于request的数据传输，对cheerio进行深度封装 初步计划 css ，xpath函数  */
    status = undefined
    method = undefined
    protocol = undefined
    host = undefined
    url = undefined
    body = undefined
    data = undefined
    cookies = {}
    headers = {}
    source = {}   // 用户需要传送到解析页面的数据,可在得到响应后获取到·请求前的数据
    connectCode = 'NORMAL'
    message = undefined
    handleRetry = false   // 倘若true时 重试后需要将其变成 false
    type = 'response'
    request = {}
    constructor(request={},axiosResp) {
        this.request = request
        this.#extractAxiosResp(axiosResp)
    }
    #extractAxiosResp(axiosResp){
        this.connectCode = axiosResp.code || this.connectCode
        if (axiosResp.message) this.message = axiosResp.message

        if (axiosResp.data || axiosResp.response){
            this.source = this.request.source || {}

            this.data = axiosResp.data || axiosResp.response.data
            this.status = axiosResp.status || axiosResp.response.status
            this.headers = axiosResp.headers || axiosResp.response.headers
            this.request.headers = axiosResp.config.headers || this.request.headers
            if (!this.request.headers['Host']|| !this.request.headers['host'] ){
                this.request.headers['Host'] = axiosResp.request.host
            }
            const cookies = this.headers['set-cookie'] || []
            cookies.forEach((val)=>{
                const cookie = val.split(';')[0]
                this.cookies[cookie.split('=')[0]] = cookie.split('=')[1]
            })
            this.url = axiosResp.config.url
            this.method = axiosResp.request.method.toLowerCase()
            this.protocol = axiosResp.request.protocol
            this.host = axiosResp.request.host
            this.path = axiosResp.request.path
        }

    }
    $(html){
        //  考虑使用中间件进行挂载
        const cheerio = require('cheerio')
        return cheerio.load(html || this.data)
    }

}


module.exports = {
    Response
}
