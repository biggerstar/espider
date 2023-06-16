'use strict'

class ImportPlugin {
    constructor() { this.#run() }
    static getInstance(){
        if(!this.importPluginInstance){
            this.importPluginInstance = new ImportPlugin()
        }
        return this.importPluginInstance
    }
    importDefaultPlugin(){
        const { retries } = require('../defaultConfig')
        const PlugIn = require('./PlugInManager').getInstance()
        //############  无条件导入  ###############
        PlugIn.use(require('../exception/Timeout'),true)

        //#########  指定配置允许导入 ##############
        if (retries) PlugIn.use(require('../exception/Retries'),true)
    }
    #run(){
        this.importDefaultPlugin()
    }
}

module.exports = ImportPlugin


