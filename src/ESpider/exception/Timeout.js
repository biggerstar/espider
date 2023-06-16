const logger = require('log4js').getLogger('eSpider')
class Timeout{
    name = 'ESpiderTimeout'
    request(request){
        // console.log('Timeout','crawlRequestProcess');
    }
    response(request,response){
        // console.log('Timeout','crawlResponseProcess');

    }
    errback(err,spider){

        // console.log('Timeout',err);
        if (err.message !== undefined && err.message.includes('timeout') && err.message.includes('exceeded')){

            logger.warn('Timeout: ' + err.request.url + ' 连接超时' )
        }
    }

}
module.exports = Timeout
