'use strict'

const NodeEventEmitter = require('events').EventEmitter
class EventEmitter extends NodeEventEmitter{
    constructor() { super() }
    static getInstance(){
        if(!this.instance) this.instance = new EventEmitter()
        return this.instance
    }
}

module.exports = EventEmitter




