


/**   此功能废弃，在other.js 中直接定义其他用户插件 */
class PluginGenerator {
    #customPlugInList = []
    #isRunning= false
    constructor() {}
    setPlugInName(name){
        this.name = name
    }
    getPlugInList() {
        return this.#customPlugInList
    }
    clearPlugInList() {
        /** 清空PluginGenerators池 */
        this.#customPlugInList = []
    }
    add(Plugin) {
        /** 功能是进行添加Plugin，支持传入字符串Plugin或 Plugin数组 */
        if (Array.isArray(Plugin)) {
            this.#customPlugInList.push.apply(this.#customPlugInList,Plugin)
        } else if (typeof Plugin === 'object') {
            this.#customPlugInList.push(Plugin)
        }
    }
    start(){
        this.#isRunning= true
    }
    // ####################################################
    // 插件指定函数区
    spiderOpen(){
        if (this.#isRunning === false)  this.start()
    }
    request(request){
        /** 插件指定调用函数*/
        if (this.getPlugInList().length <= 0 ) return
        this.getPlugInList().forEach((val)=>{
            if (val.request === undefined) return
            val.request(request)
        })

    }
    response(request,response){
        /** 插件指定调用函数*/
        if (this.getPlugInList().length <= 0 ) return
        this.getPlugInList().forEach((val)=>{
            if (val.response === undefined) return
            val.response(request,response)
        })

    }
    errback(err,request,response){
        // 写 pool一套出错或者网络请求出错二选一1
    }
    //#########################################################
}

class PlugInGeneratorsManager {
    pools = {}
    constructor() { }
    static getInstance(){
        if(!this.Instance)  this.Instance = new PlugInGeneratorsManager()
        return this.Instance
    }
    newPlugIn(PlugIn) {
        /** 新建一个PlugIn*/
        if (typeof name === 'string') {
            if (this.pools[name.trim()] !== undefined) throw new Error('PluginGenerator:' + name +　'已存在')
            const PlugIn = new PluginGenerator()
            this.pools[name.trim()] = PlugIn
            return PlugIn
        }
    }

    getPlugIn(name) {
        /** 获取一个PlugIn*/
        if (this.pools[name.trim()] === undefined) throw new Error('PluginGenerator:' + name +　'不存在')
        return this.pools[name]
    }

}

module.exports = PluginGenerator



