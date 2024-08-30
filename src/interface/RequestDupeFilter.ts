import {AxiosSessionRequestConfig} from "@biggerstar/axios-session";
import pkg, {BloomFilter} from "bloom-filters";
import {DupeFilterOptions} from "@/typings";
import path from "node:path";
import fs from "node:fs";
import md5 from "md5";
import {clearPromiseInterval, deepmerge, setPromiseInterval} from "@biggerstar/tools";
import {RequestDupeFilterDefaultOptions} from "@/constant";

export class RequestDupeFilter {
  public options: DupeFilterOptions
  private dupeFilterCacheFilePath: string
  private _persistenceTimer: number
  private _running: boolean
  private filter: BloomFilter
  private runtimeFilter: BloomFilter
  private runtimeFilterHash: string[]

  constructor() {
    this.options = {
      ...RequestDupeFilterDefaultOptions,
      filterRule: this._filterRule,
    }
    this.runtimeFilterHash = []
  }

  /**
   * 进行配置
   * */
  public setOptions(opt: Partial<DupeFilterOptions> & Record<any, any> = {}) {
    deepmerge(this.options, opt)
    return this
  }

  /**
   * 启动
   * */
  public start() {
    if (!this.options.name) {
      throw new Error('请指定爬虫名称 name')
    }
    if (!this.options.enableDupeFilter) return;
    if (this._running) return
    this.dupeFilterCacheFilePath = path.resolve(this.options.cacheDirPath, `${this.options.name}.request.filter`)
    if (!this.filter) {
      const existsFilterCache = fs.existsSync(this.dupeFilterCacheFilePath)
      const createCache = () => {
        if (existsFilterCache) {
          fs.renameSync(this.dupeFilterCacheFilePath, `${this.dupeFilterCacheFilePath}.bak`)
        }
        this.filter = new pkg.BloomFilter(this.options.supportRequestSize, this.options.hashes)
        this._persistence()
      }
      if (this.options.alwaysResetCache || !existsFilterCache) createCache()
      else if (existsFilterCache) {
        const recordFilterContent = fs.readFileSync(this.dupeFilterCacheFilePath, 'utf8')
        if (!recordFilterContent.trim()) createCache()
        else {
          try {
            this.filter = pkg.BloomFilter.fromJSON(JSON.parse(recordFilterContent))
          } catch (e) {
            const errMsg = `${this.dupeFilterCacheFilePath} 布隆去重缓存已损坏.  ${e.message}`
            throw new Error(errMsg)
          }
        }
      }
    }
    clearPromiseInterval(this._persistenceTimer)
    this._persistenceTimer = setPromiseInterval(async () => {
      this._persistence()
    }, this.options.dupePersistenceInterval, {
      doFirst: false,
      doLast: true,
    })
    this.runtimeFilter = new pkg.BloomFilter(this.options.supportRequestSize, this.options.hashes)
    this._running = true
  }

  /**
   * 进行指纹持久化，用于支持断点续爬
   * */
  private _persistence() {
    this.runtimeFilterHash.forEach(hash => this.filter.add(hash))
    this.runtimeFilterHash = []
    const basePath = path.dirname(this.dupeFilterCacheFilePath)
    if (basePath) fs.mkdirSync(basePath, {recursive: true})
    const fpData = this.filter.saveAsJSON()
    fs.writeFile(this.dupeFilterCacheFilePath, JSON.stringify(fpData), {encoding: 'utf-8'}, () => {
      // console.log('持久化请求指纹数据成功')
    })
  }

  /**
   * 将请求转换成 请求指纹
   * */
  private _filterRule(req: Partial<AxiosSessionRequestConfig>) {
    let finallyReq: Partial<AxiosSessionRequestConfig> = typeof req === 'string' ? {url: req} : req
    const urls = new URL(finallyReq.url)
    urls.searchParams.sort()
    const urlPath = `${urls.origin}${urls.pathname}`
    let headerString = ''
    let dataString = ''
    let query = urls.searchParams.toString()
    let method = req.method ? req.method.toLowerCase() : 'get'
    if (typeof finallyReq.headers === 'object') {
      headerString = Object.keys(finallyReq.headers)
        .sort()
        .map(name => `${name.toLowerCase()}=${finallyReq.headers[name]}`)
        .toString()
    }
    // 未来考虑支持  FormData  URLSearchParams buffer 指纹, 当前可设置请求头进行指定 Content-type
    // if (finallyReq.data instanceof FormData) {  
    // } 
    if (typeof finallyReq.data === 'object') {
      dataString = Object.keys(finallyReq.data)
        .sort()
        .map(name => `${name}=${finallyReq.data[name]}`)
        .toString()
    }
    const seed = `${method}+${urlPath}?${query}+${headerString}+${dataString}`
    return md5(seed)
  }

  /**
   * 获取该请求的指纹
   * */
  public get(req: Partial<AxiosSessionRequestConfig>) {
    return this.options.filterRule(req)
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
    const fp = this.get(req)
    this.addPersistenceFP(fp)
    this.addRuntimeFP(fp)
  }

  /**
   * 判断当前是否存在指定的指纹
   * */
  public hasFP(fp: string) {
    return this.runtimeFilter.has(fp) || this.filter.has(fp)
  }

  /**
   * 添加当前运行时指纹
   * */
  public addPersistenceFP(fp: string) {
    this.filter.add(fp)
  }

  /**
   * 添加当前运行时指纹
   * */
  public addRuntimeFP(fp: string) {
    this.runtimeFilter.add(fp)
    this.runtimeFilterHash.push(fp)
  }

  /**
   * 关闭自动持久化
   * */
  public closeAutoPersistence() {
    clearPromiseInterval(this._persistenceTimer)
    this._running = false
  }
}
