module.exports = {
    name:'otherPlugin',
    schedulerStart() {
        // console.log('schedulerStart插件执行了');
    },
    requestToScheduler(){
        // console.log('requestToScheduler插件执行了');
    },
    schedulerDone(){
        // console.log('schedulerDone插件执行了');
    },
    request(request){
        // console.log('插件里面的内容2',request);
    },
    response(request,response){
        // console.log('插件里面的内容1',response);
    },
    errback(err,request){
        // console.log('err',err);
    },
    spiderStart(spider){

    }
}
