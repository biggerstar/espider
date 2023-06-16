
class Retries{
    name = 'ESpiderRetries'
    request(request){
        // console.log('Retries   s');
    }
    response(response){
        // console.log('Retries  access');
    }
    errback(err,spider){

    }
}
module.exports = Retries
