import {SpiderManager} from "./SpiderManager";
import {AxiosError, AxiosRequestConfig, AxiosInstance, AxiosResponse} from "axios";


export abstract class Spider {
    [key: string]: any

    public name?: string
    public _manager: SpiderManager
    public priority: number
    public keepSession: boolean
    public session: AxiosInstance
    public middleware: Record<any, any>

    constructor() {
        const descriptors = Object.getOwnPropertyDescriptors(this.constructor.prototype)
        this.middleware = {}
        this.keepSession = false
        this.priority = 0
        Object.keys(descriptors)
            .filter(keyName => keyName.startsWith('@'))
            .forEach(name => this.middleware[name.slice(1)] = this[name]())
    }

    public addRequest(req: AxiosRequestConfig | string) {
        this._manager.addRequest(this, req).then()
    }

    public abstract request(req: AxiosRequestConfig): Promise<AxiosRequestConfig | void>

    public abstract response(req: AxiosRequestConfig, res: AxiosResponse): Promise<void>

    public abstract catch(err: AxiosError): Promise<void>

    public abstract ready(): Promise<void>

}

