class HeaderPool {
    #customHeadersList = []
    #isRunning= false
    constructor() {
    }
    setPlugInName(name){
        this.name = name
    }
    getHeadersList() {
        return this.#customHeadersList
    }

    clearHeadersList() {
        /** 清空Headers池 */
        this.#customHeadersList = []
    }

    add(Headers) {
        /** 功能是进行添加Headers，支持传入字符串Headers或Headers数组 */
        if (Array.isArray(Headers)) {
            this.#customHeadersList.push.apply(this.#customHeadersList, Headers)
        } else if (typeof Headers === 'object') {
            this.#customHeadersList.push(Headers)
        }
    }
    start(){
        this.#isRunning = true
    }
    //############################################################
    spiderOpen(){
        if (this.#isRunning === false)  this.start()
    }
    getOneHeaders() {
        return this.#customHeadersList[Math.floor(Math.random() * this.#customHeadersList.length)]
    }
    created(request){
        if ((request.headers && Object.keys(request.headers) > 0) ){
            // console.log('headers存在');
            return
        }
        request.headers = this.getOneHeaders()
    }
    //#########################################################
}


class HeaderPoolManager {
    pools = {}

    constructor() {
    }
    static getInstance(){
        if(!this.Instance)  this.Instance = new HeaderPoolManager()
        return this.Instance
    }
    newPool(name) {
        if (typeof name === 'string') {
            if (this.pools[name.trim()]) throw new Error(name +　'Header池已存在')
            const Pool = new HeaderPool()
            this.pools[name.trim()] = Pool
            return Pool
        }
    }

    getPool(name) {
        if (!this.pools[name.trim()]) throw new Error(name +　'Header池不存在')
        return this.pools[name]
    }

}

module.exports = HeaderPool



