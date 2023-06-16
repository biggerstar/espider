'use strict'
/**
 * @author biggerStar
 * @licence
 * @module deasync-promise
 * */

const axios = require("axios");


class ProxyPool {
    /**  用于管理代理IP的类，目前只支持了代理IP常用的IPV4，后面会支持IPV6  */
    // #-----------------用户可自定义设置项------------------#
    #maxProxyPoolLen = -1   // 代理池大小
    #maxSurvivalTime = -1 // 生存时间
    #deadLineTimerList = []  // 代理生存时间定时器列表
    #maxErrCount = -1      //  代理的最大错误次数
    #isFollowSpiderClose = false     //  是否跟随ESpider一起关闭
    #isWaitUntilPoolFull = false    //  是否开启ESpider的时候等待直到代理池满才进行请求
    // #--------------------------------------------#
    #customProxyList = []
    #proxyPoolTaskQueue = []
    #customUpdateProxyConfigList = []
    #isRunning = false
    constructor() {
    }
    setPlugInName(name){
        this.name = name
    }
    setGlobalSurvivalTime(survivalTime) {
        /**
         * 设置全局代理生存时间，若全局生存时间和局部生存时间冲突，以该局部设置时间的代理为准，小于0为运行期间长期存活
         * @param {Number} survivalTime 最大代理IP存活时间
         * @return {Object} 返回所在的实例this
         * */
        if (survivalTime === null || survivalTime < 1) survivalTime = -1
        this.#maxSurvivalTime = parseInt(survivalTime)
        return this
    }

    setMaxErrCount(max) {
        /**
         * 设置IP最大错误次数
         * @param {Number} max IP最大错误次数
         * */
        this.#maxErrCount = parseInt(max) || -1
    }

    getMaxErrCount() {
        /**
         * 获取IP最大错误次数 默认-1，若小于0 将会报错提示未设置maxErrCount
         * @return {Number}  最大错误次数
         * */
        return this.#maxErrCount
    }

    setPoolLen(len) {
        /**
         * 设置代理池大小
         * @param {Number} len 大于0为大小，小于0为无限制，小于0不适用于自动更新
         * */
        this.#maxProxyPoolLen = parseInt(len)
        return this
    }
    followESpiderClose(isFollow = true){
        /** 是否跟随爬虫框架一起关闭
         * @param {Boolean} isFollow
         * */
        this.#isFollowSpiderClose =  isFollow
    }
    isFull() {
        /** 代理池是否满了
         * @return {Boolean}  true  代理池满了 false  代理池没满
         * */
        return this.#customProxyList.length >= this.#maxProxyPoolLen
    }

    isEmpty() {
        /** 代理池是为空
         * @return {Boolean}  true  代理池为空 false  代理池不为空
         * */
        return this.#customProxyList.length === 0
    }

    getNowSurvivalTime() {
        /**　
         * @return {Number} 当前全局的代理IP生存时间配置值
         * */
        return this.#maxSurvivalTime
    }

    getNowProxyIpLen() {
        /**
         *  @return {Number} 当前代理池中代理IP的个数
         * */
        return this.#customProxyList.length
    }
    getOnceProxyString(){
        const proxy = this.getOneProxy()
        return  proxy['host'] + ':' + proxy['port']
    }
    getOnceProxyStringSync = async ()=>{
        const proxy = await this.getOneProxySync()
        return  proxy['host'] + ':' + proxy['port']
    }
    getOneProxy(){
        const proxyList = this.getProxyList()
        return proxyList.length > 0 ? proxyList[Math.floor(Math.random() * proxyList.length)] : null
    }
    getOneProxySync = async () => {
        /**
         * 从代理池中顺序获取一个代理IP ,如果当前时间下代理中没有IP则返回null
         * @return {Promise} 单个代理IP 例如 { host:'x.x.x.x',port:xxx }
         * */
        const proxyList = await this.getProxyListSync()
        return proxyList.length > 0 ? proxyList[Math.floor(Math.random() * proxyList.length)] : null
    }
    getProxyList(){
        return this.#customProxyList
    }
    getProxyListSync = async (defaultTimeout = 9000) => {
        /**
         * 同步获取当前的代理池列表，如果指定时间列表为空，则返回空数组，如果指定时间内发现不为空，不管当前代理池中有多少个代理直接返回当前代理列表
         * @param {Number} timeout  单位是ms，默认是9000
         * @return {Promise} 代理池中所有IP的列表，如果超时返回false，超时同时也代表列表为空
         * 返回的例子：  [{ host: '1.1.1.1', port: 8888, errCount: 3}]
         * TODO 是否把errCount字段去掉，errCount可能用于消费者主动判断错误计数情况,还有deadline用作活跃时间截止判断
         * */
        let delay = 300
        if (defaultTimeout <= 0) return []
        if (this.getProxyList().length > 0)   return  this.getProxyList()
        else  { await ProxyPool.sleep(delay)}
        return this.getProxyListSync(defaultTimeout-delay)
    }
    waitUntilPoolFull=  () =>{
        /** 只在第一次启动时搭配ESpider有效,之后没有使用场景,后面要等代理池满或者代理个数达到指定数量(fullStandardNum) 请使用waitUntilPoolFullSync */
        if (!this.#isRunning){  throw new Error('waitUntilPoolFull：请先在此之前使用start方法启动代理池')  }
        this.#isWaitUntilPoolFull = true
    }
    waitUntilPoolFullSync = async (fullStandardNum=-1) => {
        /**
         * 等待直到代理池满或达到指定参数的fullStandardNum值
         * @param {Number} fullStandardNum  可选参数，默认代理池大小，若有值代表代理池等待达到该大小就退出等待,若没满将一直等待
         * TODO 是否加入timeout
         */
        let waitCount = 0
        this.waitUntilPoolFull()    // 保证用户指示等代理池满一定执行
        if (typeof fullStandardNum !== "number") throw new TypeError('waitUntilPoolFull函数的@param：fullStandardNum 是一个数字')
        while (this.getNowProxyIpLen() < ( (fullStandardNum === -1)   ? this.#maxProxyPoolLen : fullStandardNum)) {
            if (await this.getProxyListSync() === [])  waitCount++
            if (waitCount)  throw new EvalError('waitUntilPoolFull： 等待超时，未添加任何新代理')
            await ProxyPool.sleep(1000)  // 很重要  是检验是否达到等待要求个数的检测间隔
        }
    }

    add(proxy,immediately=true) {
        /**
         * 从代理池中添加代理IP信息，支持string方式或者代理格式的对象形式
         * @param {String,Object} proxy   string格式的代理 例如 x.x.x.x:xxx,object对象格式的代理，例如 {host:'x.x.x.x',port:xxx}
         * @param {Boolean} immediately  是否立即加入代理池或者经过代理池自动调度
         * */
        if (typeof proxy === 'object' || typeof proxy === 'string') {
            if (immediately) this.#add(proxy)
            else this.#proxyPoolTaskQueue.unshift({method: 'add', data: proxy})
        }else {   throw new Error('不合法的代理数据') }
    }

    remove(proxy,immediately=true) {
        /**
         * 从代理池中移除代理IP信息，支持string方式或者代理格式的对象形式
         * @param {String,Object} proxy   string格式的代理 例如 x.x.x.x:xxx object对象格式的代理，例如 {host:'x.x.x.x',port:xxx}
         * @param {Boolean} immediately  是否立即从代理池移除或者经过代理池自动调度
         * */
        if (typeof proxy === 'object' || typeof proxy === 'string') {
            if (immediately) this.#remove(proxy)
            else this.#proxyPoolTaskQueue.unshift({method: 'remove', data: proxy})

        }else {  throw new Error('不合法的代理数据')  }
    }

    clearProxyPool() {
        /** 清空proxy池 */
        this.#customProxyList = []
    }

    start() {
        /** 开启代理池，
         * 作为插件使用：会在 schedulerStart 开启时自动启动代理池
         * 独立模式： 使用代理池只有执行startUpdate方法代理池才会生效，前面执行的函数都是对代理池进行配置 */
        (async () => {
            if (this.#maxProxyPoolLen <= 0) throw new Error('未设置代理池大小')
            this.#customUpdateProxyConfigList.forEach(val => (val.message && val['available'] !== false) ? console.log(val.message) : null)
            this.#isRunning = true
            this.#queueLoopManager().then()
            this.#updateProxyPoolManager(this.#customUpdateProxyConfigList)
        })()
        return this
    }
    close(){
        this.#isRunning = false
        this.#deadLineTimerList.forEach((val)=>{
            clearTimeout(val)
        })
    }


    handleUpdateProxy(option) {
        /** 手动获取代理IP数据，用于全自动更新维护代理池
         *  @param {String}  hostName:  返回的代理信息中，代理IP所在对象key的名字，例如匹配JSON中的 arr[hostName] === x.x.x.x
         *  @param {String}  portName:  返回的代理信息中，代理端口所在对象key的名字，例如匹配JSON中的 arr[portName] === xxx
         *  @param {String}  message: 该信息为每次启动时打印的欢迎语
         *  @param {Number}  time:  代理IP的生存时间，单位为毫秒
         *  @param {Number}  max:  单次最大提取代理数量
         *  @param {Number}  extractDelay:  间隔多少毫秒检查代理池是否满了，没满会自动添加直到代理池满，单位为毫秒
         *  @param {Boolean}  available:  是否开启该代理
         *  @param {Function} handleUpdate(option) Async Function => 支持返回值类型json,text,promise,axios对象 ；不支持返回undefined或者不返回任何数据
         *                      参数option.offset是代理池差多少个满，可手动设置每次更新个数，此参数受max参数限制，
         *                      返回值为null则表示忽略本次请求，
         *                      返回值为JSON的时候会自动解析IP和PORT，该设定详情请参考上文hostName和portName
         *                      返回值为TEXT的话只要TEXT内容中包含IP直接返回便会被智能解析，找到的IP将添加进代理池，
         *                      返回值为promise可以是ES6中的async function 直接 return data  或者 return new Promise(resolve => resolve(data))
         *                      返回值为axios对象时可以返回比如 return axios.get(url) 的形式
         */
        if (Array.isArray(option)) {
            this.#customUpdateProxyConfigList.push.apply(this.#customUpdateProxyConfigList, option.map((val) => {
                val.mode = 'handleUpdateProxy'
                return val
            }))
        } else if (typeof option === 'object') {
            option.mode = 'handleUpdateProxy'
            this.#customUpdateProxyConfigList.push(option)
        }
    }

    autoUpdateFromInternet(option) {
        /** 用于给出所需远程获取代理API配置，然后可以全自动更新维护代理池
         *  全部配置关键词示例，该函数接受一个对象option，可包含以下参数
         *  @param {String}  url : 远程代理IP的获取地址
         *  @param {Object} params: 作用是在url中的 Query 参数的补充，在params和url字符串中的查询参数冲突时，以params的值为准
         *  @param {String} hostName:  返回的代理信息中，代理IP所在对象key的名字，例如匹配JSON中的 arr[hostName] === x.x.x.x
         *  @param {String} portName:  返回的代理信息中，代理端口所在对象key的名字，例如匹配JSON中的 arr[portName] === xxx
         *  @param {Number} time:  代理IP的生存时间，单位为毫秒
         *  @param {Number} max:  单次最大提取代理数量
         *  @param {Number} extractDelay:  间隔多少毫秒检查代理池是否满了，没满会自动添加直到代理池满，单位为毫秒
         *  @param {String} controlName: 控制每次获取IP时的查询参数名称,名字可在params中定义覆盖规定每次提取IP数  例如https://example.com/?num=1 ,则此处controlName的值为 num
         *  @param {String} message: 该信息为每次启动时打印的欢迎语
         *  @param {Boolean}  available:  是否开启该代理
         *  @param {Function}  prepare(option) 该方法无返回值  option则是用户代理池配置信息，推荐可用于请求前的配置校验或者修改配置等等，修改后立即生效并更新代理池
         *  @param {Function} callback(result,option) 该方法无返回值  result返回的是axios对象，option则是用户代理池配置信息，
         *                                      推荐可用于添加IP白名单，动态修改option信息等等，若修改数据将在下一次更新请求生效
         *  注：prepare和callback的区别是prepare是请求前代理地址前的配置，修改option后会立即使用该配置进行代理池更新，
         *      而callback是拿到远程服务器返回的数据后的result和该次请求使用的option，修改此option会在下次更新代理池的请求生效
         */
        if (Array.isArray(option)) {
            this.#customUpdateProxyConfigList.push.apply(this.#customUpdateProxyConfigList, option.map((val) => {
                val.mode = 'autoUpdateProxyFromInternet'
                return val
            }))
        } else if (typeof option === 'object') {
            option.mode = 'autoUpdateProxyFromInternet'
            this.#customUpdateProxyConfigList.push(option)
        }
    }

    #handleUpdateProxy = async (option) => {
        /** handleUpdateProxy逻辑实现
         * @param {Object} option  配置信息
         * */
        option.offset = this.#maxProxyPoolLen - this.getNowProxyIpLen()
        if (option.offset > option.max) option.offset = option.max
        let result
        if (typeof (option['handleUpdate']) === 'function') {
            let handleUpdateRes = option['handleUpdate'](option)
            if (handleUpdateRes instanceof Promise) {
                result = await handleUpdateRes
                if (result === null) return false
                if (result === undefined || typeof result === 'function') {
                    throw new Error('handleUpdate:不允许返回undefined,function或者不返回任何数据 请返回axios请求对象或者Promise或者直接返回JSON，TEXT数据')
                }
                if (typeof result === 'number') result += ''
                if (typeof result !== 'string') {
                    if (typeof result === 'object'
                        && result.config  && result.headers
                        && result.request   && result.status) {  // 说明该对象是axios对象
                        result = result.data
                    }
                }
            }
        } else {
            throw new Error('handleUpdate:不是一个函数')
        }

        let proxyInfo = this.parseProxyInfo(result, option)
        if (!Array.isArray(proxyInfo)) return false
        proxyInfo = proxyInfo.map((val) => {
            val.time = !option.time  ? undefined : option.time
            return val
        })
        this.add(proxyInfo)
    }
    #autoUpdateProxyFromInternet = async (option) => {
        /** autoUpdateProxyFromInternet逻辑实现
         * @param {Object} option  配置信息
         * */
        const urlObj = new URL(option.url)
        let QueryString = ''
        option['nextIsUpdate'] = false   // 控制定时更新代理模块下一次是否启动下一次更新
        if (!option.controlName ) throw new Error('未定义controlName配置项')
        if (!option.params ) option.params = {}
        option.offset = this.#maxProxyPoolLen - this.getNowProxyIpLen()
        if (option.offset > option.max) option.offset = option.max   //  max 是单次获取IP的个数
        if (!option.params[option.controlName])  urlObj.searchParams.set(option.controlName,option.offset)   // 这里给controlName是为了生成query参数

        urlObj.searchParams.forEach((val, index) => {
            QueryString = QueryString + index + '=' + (!option.params[index]? val : option.params[index]) + '&'
        })
        option.url = urlObj['origin'] + urlObj['pathname'] + '?' + QueryString.slice(0, QueryString.length - 1)

        if (typeof (option['prepare']) === 'function') {
            this.#proxyPoolTaskQueue.push({method: 'autoModePrepare', data: {
                    func: option['prepare'],
                    option:option
                }})
        } else if (option['prepare']&& typeof (option['prepare']) !== 'function') {
            throw new Error('prepare不是一个函数,请传入函数')
        }
        let data, result
        option.timeout = 12000
        data = await axios(option)
        result = data.data
        if (typeof (option.callback) === 'function') {
            this.#proxyPoolTaskQueue.push({method: 'autoModeCallback', data: {
                    func: option.callback,
                    data : data,
                    option:option
                }})
        } else if (option['callback'] && typeof (option.callback) !== 'function') {
            throw new Error('callback不是一个函数,请传入函数')
        }else {
            option['nextIsUpdate'] = true
        }

        let proxyInfo = this.parseProxyInfo(result, option)
        if (!Array.isArray(proxyInfo)) return false
        proxyInfo = proxyInfo.map((val) => {
            val.time = !option.time ? undefined : option.time
            return val
        })
        this.add(proxyInfo)
    }

    parseProxyInfo(content, option) {
        /***
         * 用于智能解析JSON或者TEXT中的代理信息  JSON模式解析的option中可指定 hostName和 portName 用于指定JSON中代理数组的key值
         * @param {String} content  用于要解析成IP的文本或者JSON
         * @param {Object} option  解释时携带的配置，包含  hostName：用于JSON模式 下解析IP所在数组的key值名称
         *                                             portName 用于JSON模式 下解析IP所在数组的value值名称
         * */
        let mode = 'text'
        let matchHostKey = option['hostName'] || 'host'  // 这个是匹配IP列表host和port对应使用的默认关键字
        let matchPortKey = option['portName'] || 'port'
        try {
            if (typeof content === 'object' && content) {
                mode = 'json'
            }
        } catch (e) {
        }
        const hasIp = (content) => {
            if (typeof content === 'object') {
                try {
                    content = JSON.stringify(content)
                } catch (e) {
                    content += ''
                }
            }
            if (content === '') return false
            let pattern = /((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}/;
            return pattern.test(content);
        }
        const findJsonIpMode = (contentPart) => {
            //  注意本函数使用的正则表达式不能匹配X.X.X.X.X 或 X.X.X 或 http://adc.com:xxx等类型的情况
            if (hasIp(contentPart)) {
                for (const key in contentPart) {
                    if (!hasIp(contentPart[key])) continue
                    if (Array.isArray(contentPart)) {
                        if (ProxyPool.#checkIsProxyIp({
                            host: (contentPart[0][matchHostKey] || contentPart[0]['ip']),
                            port: (contentPart[0][matchPortKey] || contentPart[0]['port']),
                        },'pureIp')) {
                            return contentPart.map((val, index) => {
                                return {
                                    host: val[matchHostKey] || val['ip'],
                                    port: val[matchPortKey] || val['port'],
                                }
                            })
                        }
                    }
                    return findJsonIpMode(contentPart[key])
                }
            } else {
                return false
            }
        }
        const findTextIpMode = (content) => {
            /** 该正则表达式能匹配IPV4的IP+端口 */
            let pattern = /(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\:({[0-9]|[1-9]\d{1,3|[1-5]\d{4}|6[0-5]{2}[0-3][0-5])/img;
            return content.match(pattern)
        }
        let proxyInfo
        if (mode === 'json') {
            proxyInfo = findJsonIpMode(content)
        } else if (mode === 'text') {
            proxyInfo = findTextIpMode(content)
        }
        return proxyInfo
    }

    #updateProxyPoolManager(proxyConfigList) {
        /**
         * 该方法用于定时查询代理池是否为满，如果不满将会自动添加IP直至代理池满  适用于动态代理池，静态代理池不轮询
         * param  {Object} proxyConfigList  用户不同模式下设置的自动更新配置列表
         * */
        let timer
        const update = () => {
            if (!this.#isRunning) clearInterval(timer)
            if (this.isFull()) return false
            for (let i = 0; i < proxyConfigList.length; i++) {
                let canUse = false
                const nowTime = Math.round((new Date().getTime()))
                const proxyConfig = proxyConfigList.shift()
                if (proxyConfig['available'] === false) continue
                if (!proxyConfig['extractDelay']) {
                    canUse = true
                    proxyConfig.lastTime = nowTime
                } else if (!isNaN(parseInt(proxyConfig['extractDelay']))) {  // 不是NaN说明是数字,此处是数字才符合
                    if (!proxyConfig.lastTime
                        || nowTime - proxyConfig.lastTime >= proxyConfig['extractDelay']) {
                        canUse = true
                        proxyConfig.lastTime = nowTime
                    }
                }
                proxyConfigList.push(proxyConfig)
                if (!canUse) continue
                if (!proxyConfig['nextIsUpdate']) proxyConfig['nextIsUpdate'] = true
                if(proxyConfig['nextIsUpdate']) this.#proxyPoolTaskQueue.push({method: proxyConfig.mode, data: proxyConfig})
                break
            }
        }
        if (this.#customUpdateProxyConfigList.length > 0) timer = setInterval(update, 500) // 静态代理池不定时查询
    }
    #queueLoopManager = async () => {
        /** 该方法用于监控代理池内置任务队列，有任务便执行*/
        const processQueueTaskFun = async (task) => {
            if (task.method === 'remove') this.#remove(task.data)
            if (task.method === 'add') this.#add(task.data)
            if (task.method === 'autoModePrepare') {
                await task.data.func(task.data.option)
            }
            if (task.method === 'autoModeCallback') {
                await task.data.func(task.data.data,task.data.option)
                task.data.option['nextIsUpdate'] = true
            }
            if (task.method === 'autoUpdateProxyFromInternet') {
                if (this.isFull()) return false
                await this.#autoUpdateProxyFromInternet(task.data)
            }
            if (task.method === 'handleUpdateProxy') {
                if (this.isFull()) return false
                await this.#handleUpdateProxy(task.data)
            }
        }
        let timer
        const queueProcessControl = async () => {
            if (!this.#isRunning) return false
            if (this.#proxyPoolTaskQueue.length > 0) {
                await processQueueTaskFun(this.#proxyPoolTaskQueue.shift())
                clearTimeout(timer)
                await new Promise(resolve => timer = setTimeout(async ()=>{
                    await queueProcessControl()
                    resolve()
                }, 0) )

                await timer
            } else {
                clearTimeout(timer)
                await new Promise(resolve => timer = setTimeout(async ()=>{
                    await queueProcessControl()
                    resolve()
                }, 500) )
            }
        }
        await new Promise(resolve => timer = setTimeout(async ()=>{
            await queueProcessControl()
            resolve()
        },0))
    }

    #pushProxy(proxy) {
        /**
         * 将代理IP添加进代理池，过滤有设置生存时间的代理并设置定时从代理池中移除,同时清理已销毁的定时器缓存
         *  proxy 支持String 和 Object 形式的代理ip
         * */
        if (!proxy.host || !proxy.port) return
        let survivalTime = proxy.time && parseInt(proxy.time) > 0 ? parseInt(proxy.time) : this.#maxSurvivalTime
        delete proxy.time
        proxy.port = parseInt(proxy['port'])
        // proxy.deadline = Math.round((new Date().getTime())) + survivalTime
        this.#customProxyList.push(proxy)

        if (survivalTime > 0 && this.#isRunning) {
            this.#deadLineTimerList.forEach((val,index)=>{
                if (val['_destroyed']) this.#deadLineTimerList.splice(index,1)  // 只操作一个不和foreach冲突
            })
            this.#deadLineTimerList.push(setTimeout(() => {
                this.remove(proxy)
            }, survivalTime))
        }
    }

    #add(proxy) {
        /** 功能是进行添加proxy，支持传入字符串proxy例如 X.X.X.X:XXX 或proxy数组,若不符合IP格式自动丢弃*/
        if (this.#maxProxyPoolLen <= this.getNowProxyIpLen()) return;  // 有可能高并发下会超出，不会进行丢弃且会加入，此时可能溢出
        if (typeof proxy === 'string') {
            if (proxy !== '') {
                if (ProxyPool.#checkIsProxyIp(proxy)) this.#pushProxy(ProxyPool.#proxyString2Dict(proxy))
            }
        } else if (Array.isArray(proxy)) {
            proxy.forEach((val, index) => {
                if (ProxyPool.#checkIsProxyIp(val)) {
                    if (typeof val === 'string') this.#pushProxy(ProxyPool.#proxyString2Dict(val))
                    else if (typeof val === 'object') this.#pushProxy(val)
                }
            })
        } else if (typeof proxy === 'object') {
            if (ProxyPool.#checkIsProxyIp(proxy)) this.#pushProxy(proxy)
        }
    }

    #remove(proxy) {
        /** 移除代理，支持单个字符串和Object 形式的代理格式*/
        if (typeof proxy === 'string') proxy = ProxyPool.#proxyString2Dict(proxy)
        this.#customProxyList.forEach((val, index) => {  // forEach 只删除一个在这里和 splice 不冲突
            if (val.host === proxy.host && parseInt(val.port)=== parseInt(proxy.port)) this.#customProxyList.splice(index, 1)
        })
    }
    // ###################插件指定函数#########################
    spiderOpen = async () => {
        console.log(1111111111);
        if (this.#isRunning === false)  await this.start()
        if (this.#isWaitUntilPoolFull)  await this.waitUntilPoolFullSync()
        console.log(2222222222);
        console.log(this.getProxyList());
        // console.log('spiderOpen暂停5秒');
        // await ProxyPool.sleep(5000)
        // throw new Error('代理池未开启,请执行startUpdate函数开启更新')
    }
    request = async (request) => {
        const proxy = await this.getOneProxySync()
        // 倘若true时 重试后需要将其变成 false
        if (proxy === null)  request.handleRetry = true
        else request.proxy = proxy
        console.log('request暂停2秒');
        await ProxyPool.sleep(2000)
    }
    spiderClose = async (s)=>{
        //  开发调度器任务队列
        // console.log('spiderClose暂停5秒');
        // await ProxyPool.sleep(5000)
        // console.log('spiderClose',s);
        if (this.#isFollowSpiderClose) {
            console.log('关闭代理池');
            this.close()
        }
    }
    //#################################################
    created = async (req)=>{
        console.log('created暂停5秒');
        await new Promise(resolve => setTimeout(resolve, 5000))
    }
    response = async (res)=>{
        console.log('response暂停5秒');
        await new Promise(resolve => setTimeout(resolve, 5000))
    }
    errback = async (errRes)=>{
        console.log('errback暂停5秒');
        await new Promise(resolve => setTimeout(resolve, 5000))
    }
    spiderEmpty = async (spider)=>{
        console.log('spiderEmpty暂停5秒');
        await new Promise(resolve => setTimeout(resolve, 5000))
    }
    spiderPause(){}
    spiderContinue(){}
    //#########################################################
    static sleep = async (ms) => {
        /** 用于休眠，单位毫秒 ms */
        // deasync-promise
        // sleepFromPromise(new Promise(resolve => setTimeout(resolve, ms)))
        await new Promise(resolve => setTimeout(resolve, ms))
    }

    static #proxyString2Dict(proxyString) {
        /** 将字符串类型的代理转成Object类型*/
        return {
            host: proxyString.split(':')[0],
            port: proxyString.split(':')[1]
        }
    }

    static #checkIsProxyIp(ip,mode='normal') {
        /** 检查是是否是代理IP，支持1.1.1.1:888形式或者对象{host:1.1.1.1,port:888} 形式的代理IP校验，每次只能检验一个
         * @param {String} mode : pureIp || normal (default)   normal模式只检查端口可接受adc.com:xxx类型
         *                                                     pureIp模式严格匹配x.x.x.x:xxx形式的代理
         * */
        let isProxyIp = false
        ip = typeof ip === 'object' ? ip['host'] + ':' + ip['port'] : ip;
        const proxyInfo = ip.split(':')
        let port = proxyInfo[proxyInfo.length-1]
        proxyInfo.splice(proxyInfo.length-1,1)
        let host = proxyInfo.join('')
        const hostPartList = host.split(':')[0].split('.')
        if (mode === 'normal'){
            if (  port > 0 && port < 65535) return !isProxyIp
        }else if(mode === 'pureIp'){
            if (hostPartList.length !== 4 || ip.split(':')[1] < 0 || ip.split(':')[1] > 65535) return isProxyIp
            for (const partKey in hostPartList) {
                if (isNaN(parseInt(hostPartList[partKey]))
                    || hostPartList[partKey] < 0
                    || hostPartList[partKey] > 255) return isProxyIp
            }
            return !isProxyIp
        }else  throw new Error(mode+ '设置错误，请检查' )


    }

    static #format(str, param) {
        /** TODO 计划用于自动更新IP功能的URL参数模板匹配  如： https://test.com/ip?num={0}&back=json  */
        if (Array.isArray(param)) {
            for (let key in param)
                str = str.replace(new RegExp("\\{" + key + "\\}", "g"), param[key]);
            return str;
        }
    }


    errCount(proxy,ignoreError=false) {
        /**
         * 用于统计指定代理IP的错误次数，超过指定错误次数将从代理池移除,若代理池中没指定IP，将忽略本次计数
         * @param {Object} proxy Object对象类型的代理IP
         * @param {String} proxy String类型的代理IP
         * TODO 加入报错机制，如果代理池没指定IP，报错，可主动设置 ignoreError 进行忽略报错
         * 注意： 需代理池中包含指定IP才能进行错误计数，如果没有将忽略不会计数
         * */
        if (this.#maxErrCount < 0) throw new Error('未设置maxErrCount,')
        if (!ProxyPool.#checkIsProxyIp(proxy) && !ignoreError) throw new Error('errCount: 传入的不是代理IP,请检查')
        if (Array.isArray(proxy)) throw new Error('请传入string形式或者object对象形式的代理IP')
        if (typeof proxy === 'string') proxy = ProxyPool.#proxyString2Dict(proxy)
        this.#customProxyList.forEach((val, index) => {
            if (val.host === proxy.host && parseInt(val.port) === parseInt(proxy.port)) {
                val.errCount = (!val.errCount ? 1 : val.errCount + 1)
                if (val.errCount >= this.#maxErrCount) this.#remove(proxy)
            }
        })
    }
}

class ProxyPoolManager {
    pools = {}

    constructor() {
    }
    static getInstance(){
        if(!this.Instance)  this.Instance = new ProxyPoolManager()
        return this.Instance
    }
    newPool(name) {
        if (typeof name === 'string') {
            if (this.pools[name.trim()]) throw new Error(name +　'代理池已存在')
            const Pool = new ProxyPool()
            this.pools[name.trim()] = Pool
            return Pool
        }
    }

    getPool(name) {
        if (!this.pools[name.trim()]) throw new Error(name +　'代理不存在')
        return this.pools[name]
    }

}

module.exports = ProxyPool
