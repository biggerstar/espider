'use strict'
class ESpider {
    constructor() {
        ESpider.init()
        this.export()
    }
    static getInstance(){
        if(!this.instance)  {
            this.instance = new ESpider()
        }
        return this.instance
    }
    static init(){
        //------------ init -------------//
        require('./code/ImportPlugin').getInstance()
    }
    export(){
        //----------- export ------------//
        // console.log('export');
        // console.log(require('./SpiderManager').SpiderManager.getInstance());
        // console.log(require('./SpiderManager').SpiderManager.getInstance());
        // console.log(require('./SpiderManager').SpiderManager.getInstance());
        require('./code/SpiderManager').SpiderManager.getInstance()
        require('./code/SpiderManager').SpiderManager.getInstance()
        require('./code/SpiderManager').SpiderManager.getInstance()
        require('./code/SpiderManager').SpiderManager.getInstance()


        // console.log(require('./SpiderManager').getInstance());
        const spiderManager = require('./code/SpiderManager').SpiderManager.getInstance()

        this.__name__ = 'ESpider'
        this.__version__ = '0.0.1'
        this.default = {}
        this.Spider = require('./Spider')
        this.spiderManager  =  spiderManager
        this.downloader  =  require('./code/Downloader').getInstance()
        this.plugInManager = require('./code/PlugInManager').getInstance()
        this.http = {
            Request : require('./Request'),
            Response : require('./Response'),
        }
        this.use =  (p,globalValidation)=> { require('./code/PlugInManager').getInstance().use(p,globalValidation)}
        this.setting =  (setting) => {}
        this.addSpiders =   (SpiderArray) => spiderManager.addSpiders(SpiderArray)
        this.addSpider =   (spider,args) => spiderManager.addSpider(spider,args)
        this.crawl =  (spiderInfo) => spiderManager.crawl(spiderInfo)
        this.pause =  (spiderInfo) => spiderManager.pause(spiderInfo)
        this.continue =  (spiderInfo) => spiderManager.continue(spiderInfo)
        this.close =  (spiderInfo) => spiderManager.close(spiderInfo)
        return this
    }
}
module.exports = ESpider.getInstance()







