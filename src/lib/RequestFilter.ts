import {AxiosSessionRequestConfig} from "@biggerstar/axios-session";
import pkg, {BloomFilter} from 'bloom-filters';
import * as fs from "node:fs";
import md5 from 'md5'
import {RequestFilterOptions} from "../typings";
import {everyHasKeys} from "../utils/methods";
import * as path from "path";

export class RequestDupeFilter {
  private filter: BloomFilter
  public supportRequestSize: number
  public dupeFilterCacheFilePath: string
  public requestFilterReset: boolean
  public hashes: number
  public dupePersistenceInterval: number
  private _persistenceTimer: NodeJS.Timeout
  public _running: boolean
  private runtimeFilter: BloomFilter
  private runtimeFilterHash: string[]
  public enableDupeFilter: boolean

  constructor() {
    this.dupeFilterCacheFilePath = './.cache/request.filter'
    this.supportRequestSize = 1e8   // 一亿
    this.hashes = 2
    this.dupePersistenceInterval = 5 * 1000
    this.enableDupeFilter = true
    this.requestFilterReset = false
    this.runtimeFilterHash = []
  }

  /**
   * 进行配置
   * */
  public setOptions(opt: Partial<RequestFilterOptions> & Record<any, any> = {}) {
    const whiteList = ['requestFilterReset', 'hashes', 'supportSize', 'filterCacheFilePath']
    whiteList.forEach(name => everyHasKeys(this, opt, [name]) && (this[name] = opt[name]))
  }

  /**
   * 启动
   * */
  public start() {
    if (!this.enableDupeFilter) return;
    if (this._running) return
    this._persistenceTimer = setInterval(() => {
      clearInterval(this._persistenceTimer)
      this._persistence()
    }, this.dupePersistenceInterval)
    if (!this.filter) {
      const existsFilterCache = fs.existsSync(this.dupeFilterCacheFilePath)
      if (this.requestFilterReset || !existsFilterCache) {
        this.filter = new pkg.BloomFilter(this.supportRequestSize, this.hashes)
        this._persistence()
      } else if (existsFilterCache) {
        const recordFilterContent = fs.readFileSync(this.dupeFilterCacheFilePath, 'utf8')
        try {
          this.filter = pkg.BloomFilter.fromJSON(JSON.parse(recordFilterContent))
        } catch (e) {
          throw new Error(`${this.dupeFilterCacheFilePath} 去重缓存已损坏.  ${e.message}`)
        }
      }
    }
    this.runtimeFilter = new pkg.BloomFilter(this.supportRequestSize, this.hashes)
    this._running = true
  }

  /**
   * 进行持久化，用于支持断点续爬
   * */
  public _persistence() {
    this.runtimeFilterHash.forEach(hash => this.filter.add(hash))
    this.runtimeFilterHash = []
    const basePath = path.dirname(this.dupeFilterCacheFilePath)
    if (basePath) fs.mkdirSync(basePath, {recursive: true})
    const fpData = this.filter.saveAsJSON()
    fs.writeFileSync(this.dupeFilterCacheFilePath, JSON.stringify(fpData), 'utf8')
  }

  /**
   * 将请求转换成 请求指纹
   * */
  public get(req: Partial<AxiosSessionRequestConfig>) {
    let finallyReq: Partial<AxiosSessionRequestConfig> = typeof req === 'string' ? {url: req} : req
    const urls = new URL(finallyReq.url)
    urls.searchParams.sort()
    const urlPath = `${urls.origin}${urls.pathname}`
    let headerString = ''
    let dataString = ''
    let query = urls.searchParams.toString()
    if (typeof finallyReq.headers === 'object') {
      headerString = Object.keys(finallyReq.headers)
        .toSorted()
        .map(name => `${name.toLowerCase()}=${finallyReq.headers[name]}`)
        .toString()
    }
    // 未来考虑支持  FormData  URLSearchParams buffer 指纹, 当前可设置请求头进行指定 Content-type
    // if (finallyReq.data instanceof FormData) {  
    // } 
    if (typeof finallyReq.data === 'object') {
      dataString = Object.keys(finallyReq.data)
        .toSorted()
        .map(name => `${name}=${finallyReq.data[name]}`)
        .toString()
    }
    const seed = `${urlPath}?${query}+${headerString}+${dataString}`
    return md5(seed)
  }

  /**
   * 判断过滤器是否存在该 请求对象指纹
   * */
  public has(req: Partial<AxiosSessionRequestConfig>): boolean {
    return this.hasFP(this.get(req))
  }

  /**
   * 添加来自 请求对象的 指纹
   * */
  public add(req: Partial<AxiosSessionRequestConfig>): void {
    this.addFP(this.get(req))
  }

  /**
   * 判断当前是否存在指定的指纹
   * */
  public hasFP(fp: string) {
    return this.runtimeFilter.has(fp) || this.filter.has(fp)
  }

  /**
   * 添加当前指纹
   * */
  public addFP(fp: string) {
    this.runtimeFilter.add(fp)
    this.runtimeFilterHash.push(fp)
  }

  /**
   * 关闭自动持久化
   * */
  public closeAutoPersistence() {
    clearInterval(this._persistenceTimer)
    this._running = false
  }
}
