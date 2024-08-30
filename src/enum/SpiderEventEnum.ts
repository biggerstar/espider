export enum SpiderEventEnum {
  /*  可匹配 URL scope 事件  */
  SpiderRequestTask = "SpiderRequestTask",
  SpiderRequest = "SpiderRequest",
  SpiderResponse = "SpiderResponse",
  SpiderError = "SpiderError",
  /*  普通事件  */
  SpiderReady = "SpiderReady",
  SpiderStart = "SpiderStart",
  SpiderStarted = "SpiderStarted",
  SpiderPause = "SpiderPause",
  SpiderPaused = "SpiderPaused",
  SpiderClose = "SpiderClose",
  SpiderClosed = "SpiderClosed",
  SpiderCreateSession = "SpiderCreateSession",
  SpiderIdle = "SpiderIdle",
}

export enum RequestStatusEnum {
  READY = 1,
  PENDING = 2,
  DONE = 2,
}
