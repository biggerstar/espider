'use strict'

class Queue {
    /** 为ESpider定制的优先队列 */
    #maxPriority = 1   // 默认单个队列优先级
    maxQueue = -1
    #priorityQueue =  []

    constructor(maxPriorityLevel=-1) {
        /** @param {Number}  maxPriorityLevel 设置队列的最大优先级 */
        this.#maxPriority = maxPriorityLevel
        for (let i = 0; i < this.#maxPriority; i++) this.#priorityQueue.push([])
    }
    setMaxQueue(max){
        /** @param {Number} max 设置最大的队列长度 */
        this.maxQueue = max
        return this
    }
    getQueueList(){
        return this.#priorityQueue
    }
    getQueueLength(){
        return this.#priorityQueue.flat().length
    }
    full(){
        /** @return {Boolean}  empty 队列是否为满  */
        if (this.maxQueue === -1){ return false }  // -1 默认无限队列长度
        return this.#priorityQueue.flat().length >= this.maxQueue
    }
    empty(priority){
        /**
         * @param {Number}  priority 指定优先级所在队列是否为空
         * @return {Boolean}  empty 队列是否为空
         * */
        return !priority  ? !this.#priorityQueue.flat().length :!this.#priorityQueue[priority-1].length

    }
    pop = (priority=null)=> {
        /** 出队列 : 按优先级出队列,若已经队列空则返回null  */
        for (let k in this.#priorityQueue) {
            if (priority!==null )  k = priority - 1
            if (!this.empty(parseInt(k)+1)) return this.#priorityQueue[k].shift()
        }
        return null
    }
    queue(data,priority = 1 ){
        /** 入队列
         * @param {any} data 入队数据
         * @param {number} priority 入队给予的优先级,外部指定数值最低为1，队列内部实际存放索引值为priority-1
         * */
        if (this.full()) return '已达最大队列，丢弃本次添加的请求'  // 后面改成warn
        if (priority > this.#maxPriority)  priority = this.#maxPriority
        else if(priority <= 0)  priority = 1
        this.#priorityQueue[priority-1].push(data)
    }
}


class ESpiderQueueManager {
    #EQueue = {}  // ESpiderQueue
    constructor() { }
    static getInstance(){
        if(!this.instance) this.instance = new ESpiderQueueManager()
        return this.instance
    }
    newESpiderQueue(name,customQueue){
        //  接受自定义的队列配置
        this.#EQueue[name] = customQueue
    }
    getQueue(name){
        return this.#EQueue[name]
    }

}




module.exports = {
    ESpiderQueueManager,
    Queue
}







