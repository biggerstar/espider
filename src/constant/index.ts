import {BaseESpiderInterfaceOptions, DupeFilterOptions} from "@/typings";

export const SPIDER_ERROR_TYPE = {
  GET_PROXY_ERROR: '获取代理失败'
}

export const CACHE_DIR_PATH = `./.espider`

export const BaseESpiderDefaultOptions: BaseESpiderInterfaceOptions = {
  name: '',
  cacheDirPath: CACHE_DIR_PATH,
  queueCheckInterval: 1000,
  dbQueueTimeout: 12000,
  requestQueueTimeout: 12000,
  requestConcurrency: 1,
  requestInterval: 0,
  dupeFilterOptions: {},
  taskOptions: {}
}

export const RequestDupeFilterDefaultOptions: DupeFilterOptions = {
  name: '',
  supportRequestSize: 1e8,  // 一亿
  hashes: 2,
  dupePersistenceInterval: 6.18 * 1000,
  enableDupeFilter: true,
  alwaysResetCache: false,
  filterRule: null,
  cacheDirPath: CACHE_DIR_PATH,
}
