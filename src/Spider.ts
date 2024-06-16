import {SpiderManager} from "./SpiderManager";
import {
    AxiosSessionError,
    AxiosSessionInstance,
    AxiosSessionRequestConfig,
    AxiosSessionResponse
} from "@biggerstar/axios-session";

export interface ESpiderMiddleware {
    onRequest?<T extends AxiosSessionRequestConfig>(this: Spider, req: T): Promise<T | void>

    onResponse?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: Spider, req: T, res: R): Promise<void | R>

    onError?<T extends AxiosSessionError>(this: Spider, err: T): Promise<void | T>
}

export class Spider {
    [key: `@${string}`]: () => ESpiderMiddleware

    public name?: string
    public _manager: SpiderManager
    public priority: number
    public session: AxiosSessionInstance
    public middleware: Record<string, ESpiderMiddleware>

    constructor() {
        const descriptors = Object.getOwnPropertyDescriptors(this.constructor.prototype)
        this.middleware = {}
        this.priority = 0
        Object.keys(descriptors)
            .filter(keyName => keyName.startsWith('@'))
            .forEach(name => this.middleware[name.slice(1)] = this[name]())
    }

    public addRequest<T extends AxiosSessionRequestConfig>(req: Partial<T> | string): void {
        this._manager.addRequest(this, req).then()
    }

    public addToDatabaseQueue(callback: Function) {
        this._manager.addToDatabaseQueue(this, callback).then()
    }


    public onRequest?<T extends AxiosSessionRequestConfig>(req: T): Promise<T | void> | T {
        return void 0
    }

    public onResponse?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(req: T, res: R): Promise<void | R> | T {
        return void 0
    }

    public onError?<T extends AxiosSessionError>(err: T): Promise<void | T> | T {
        return void 0
    }

    public onReady?(): Promise<void>
}

