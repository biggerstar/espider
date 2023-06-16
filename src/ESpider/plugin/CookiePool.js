
/**
支持多重添加cookie的方式
1.直接把cookie串传入
cookiePool.add('11')
2.使用数组，成员全为字符串
cookiePool.add(['22'])
3.直接传入一个字典的对象
cookiePool.add({
    'a':'1',
    'b':'2',
})
4.使用数组，成员全为字典对象
cookiePool.add([
    {
        'c':'3',
        'd':'4',
    },
    {
        'e':'5',
        'f':'6',
    },
])
5.使用数组，成员为字典对象和字符串的混合
cookiePool.add([
    'g=7;h=8;'
    ,
    {
        'i':'9',
        'j':'10',
    },
])
以上不同的传入参数最终都会变成
[
  '11',
  '22',
  'a=1;b=2;',
  'c=3;d=4;',
  'e=5;f=6;',
  'g=7;h=8;',
  'i=9;j=10;'
]

*/


class CookiePool  {
    //  cookiejar
    /** 目前只支持静态Cookie池或者手动进行Cookie池更新，如需 动态更新 远程服务器返回的Cookie请使用session请求方式 */
    #_customCookieList = []
    #isRunning= false
    constructor() { }
    setPlugInName(name){
        this.name = name
    }
    getCookieList(){
        return this.#_customCookieList
    }
    clearCookieList() {
        /** 清空cookie池 */
        this.#_customCookieList = []
    }
    add(Cookie){
        /** 功能是进行添加Cookie，支持传入字符串Cookie或Cookie数组 */
        if ( typeof Cookie === 'string' || typeof Cookie === 'number' ){
            if (Cookie !== ''){
                this.#_customCookieList.push('' + Cookie)
            }
        }else if ( Array.isArray(Cookie)){
            const newCookie = Cookie.map((val,index)=>{
                if (typeof val === 'string'){
                    return val
                }else if (typeof val === 'object'){
                    return CookiePool.cookieDict2String(val)
                }
            })
            this.#_customCookieList.push.apply(this.#_customCookieList,newCookie)

        }else if (typeof Cookie === 'object' ){
            this.#_customCookieList.push(CookiePool.cookieDict2String(Cookie))
        }
    }
    getOneCookie(){
        /** 随机选一个Cookie */
        return this.#_customCookieList[Math.floor(Math.random() * this.#_customCookieList.length)]
    }
    start(){
        this.#isRunning= true
    }
    //#########################################################
    spiderOpen(){
        if (this.#isRunning === false)  this.start()
    }
    request(request){
        if (request.cookie&& typeof request.cookie === 'string'){
            request.headers['Cookie'] = request.cookie
            return
        }
        if (request.headers&&(request.headers['cookie']|| request.headers['Cookie'])){
            return
        }
        const Cookie = this.getOneCookie()
        if (!request.headers){
            request.headers = {}
        }
        request.headers['Cookie'] = Cookie
        request.cookie = Cookie
    }
    //#########################################################
    static cookieDict2String(cookieDict){
        let cookie = ''
        for (const dictKey in cookieDict) {
            cookie = cookie + dictKey + '=' + cookieDict[dictKey] + ';'
        }
        return cookie
    }
    static cookieString2Dict(cookieString){
        let cookieDict = {}
        cookieString.split(';').forEach((val,index)=>{
            if (!val) return
            cookieDict[val.split[0]] = val.split[1]
        })
        return cookieDict
    }


}

class CookiePoolManager{
    pools = {}
    constructor() {
    }
    static getInstance(){
        if(!this.Instance)  this.Instance = new CookiePoolManager()
        return this.Instance
    }
    newSessionPool(){

    }

    newPool(name){
        if (typeof name === 'string'){
            if (this.pools[name.trim()] !== undefined) throw new Error(name +　'Cookie池已存在')
            const  Pool = new CookiePool()
            this.pools[name.trim()] = Pool
            return Pool
        }

    }
    getPool(name){
        if (this.pools[name.trim()] === undefined) throw new Error(name +　'Cookie池不存在')
        return this.pools[name] || false
    }

}

module.exports = CookiePool

