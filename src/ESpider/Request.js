'use strict'
const logging = require('log4js').getLogger()

class Request {
    url = ''
    method = 'get'
    encode = 'utf-8'
    headers = {}
    params = {}
    data = {}
    source = {}    // 用户需要传送到解析页面的数据,可在得到响应后获取到·请求前的数据
    proxy = false
    cookie = undefined
    callback = undefined
    errback = undefined
    plugins = []
    timeout = 30000
    priority = 0
    discard = false   // 是否丢弃本次请求
    direct = false   // 是否直接请求不通过执行器调度
    __belongFromSpiderName = ''
    #method = [
        'get','GET',
        'post','POST',
        'put','PUT',
        'delete','DELETE'
    ]
    constructor(request) {
        if(!request.plugins){   // 防止用户写错 plugins 拼写
            if (request.plugin){
                request.plugins = request.plugin
                delete request.plugin
            }
        }
        Object.assign(this,request)
        if (request.method !== 'get') delete this.params  // 只对 get支持 params
        if (!this.#checkRequestOptionsRule())  this.discard = true   // 未符合请求格式校验，放弃请求
    }
    static #checkUrlRule(string) {
        const ReUrl = `
             "^((https|http|ftp|rtsp|mms)?://)"
             + "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?"  
             + "(([0-9]{1,3}\\.){3}[0-9]{1,3}"  + "|"  + "([0-9a-z_!~*'()-]+\\.)*"  
             + "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\\."  + "[a-z]{2,6})"  
             + "(:[0-9]{1,4})?" + "((/?)|"  +  "(/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+/?)$";`
        const Re = new RegExp(ReUrl)
        return Re.test(string);

    }
    #checkRequestOptionsRule(){
        if(Request.#checkUrlRule(this.url)){   // 进行网址校验
            logging.error(this.url ,'网址不符合规则')
            return false
        }else if(-1 === this.#method.indexOf(this.method) ) {
            logging.error(this.url ,this.method ,'请求方法未许可')
            return false
        }
        return true
    }
}

class PostRequest extends Request{
    constructor(options,spider) {
        options.method = 'post'
        super(options,spider);
    }
}


module.exports = {
    Request,
    PostRequest
}
