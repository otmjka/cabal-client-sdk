import {
  CabalTradeStreamMessages,
  CabalUserActivityStreamMessages,
  MigrationStatus,
  PoolKind,
  QuoteKind,
} from '../../cabal-clinet-sdk';

export enum CabalMessageType {
  CabalEvent = 'CABAL_EVENT',
}

export enum BackgroundMessages {
  INIT_CABAL = 'INIT_CABAL',
  SUBSCRIBE_TOKEN = 'SUBSCRIBE_TOKEN',
  BUY_MARKET = 'BUY_MARKET',
  SELL_MARKET = 'SELL_MARKET',
  SET_APIKEY = 'SET_APIKEY',
}

export type BgInitMessageResponse = {
  url: string;
  mint: string;
  isReady: boolean;
  apiKey: string | null;
};

// Messages to Background

export type InitCabalOnTabMessage = {
  type: BackgroundMessages.INIT_CABAL;
  data: {
    url: string;
    mint: string;
  };
};

export type SubscribeTokenPayloadMessage = {
  type: BackgroundMessages.SUBSCRIBE_TOKEN;
  data: {
    mint: Mint;
  };
};

export type BuyMarketPayloadMessage = {
  type: BackgroundMessages.BUY_MARKET;
  data: {
    mint: Mint;
    amountSol: number;
  };
};

export type SellMarketPayloadMessage = {
  type: BackgroundMessages.SELL_MARKET;
  data: {
    mint: Mint;
    amountBps: Bps;
  };
};

export type SendApiKeyPayloadMessage = {
  type: BackgroundMessages.SET_APIKEY;
  data: {
    apiKey: string | null;
  };
};

export type MessageToBgPayload =
  | InitCabalOnTabMessage
  | SubscribeTokenPayloadMessage
  | BuyMarketPayloadMessage
  | SellMarketPayloadMessage
  | SendApiKeyPayloadMessage;

export type SubscribeTokenResponse = {
  isReady: boolean;
};

export type BuyMarketResponse = {
  isReady: boolean;
};

export type SellMarketResponse = {
  isReady: boolean;
};

export type BgMessageResponse =
  | BgInitMessageResponse
  | SubscribeTokenResponse
  | BuyMarketResponse
  | SellMarketResponse;

export type BgMessageCb = (response: BgMessageResponse) => void;

// Response to background

export type SendResponse = (params: { ok: boolean }) => void;

export type Mint = string;
export type Bps = number; // 100% 100_00 Bps

export type TokenStatusParsed = {
  mint: string;
  poolId: string;
  poolKind: PoolKind;
  migrationStatus: MigrationStatus;
  supply: string; // bigint;
  baseLiq: string; // bigint;
  quoteLiq: string; // bigint;
  qouteKind: QuoteKind;
  taxBps?: number;
  ticker: string;
};

export type TradeStatsParsed = {
  mint: Mint;
  tokenBalance: string;
  buyQoute: string;
  sellQoute: string;
  buyBase: string;
  sellBase: string;
  buys: number;
  sells: number;
  solBalance: string;
  lastTradedSlot: string;
  tokenDecimals: number;
  qouteKind: QuoteKind;
};

export type TradeEventParsed = {
  type: TradeType;
  value: {
    mint: Mint;
    timestamp: number;
    amountSol: string;
    baseLiq: string;
    quoteLiq: string;
    poolKind: PoolKind;
  };
};

export enum CabalCommonMessages {
  readyStatus = 'readyStatus',
}

/*
  txCB
*/

export type txConfirmedParsedBuyTrade = {
  tradeType: 'buy';
  mint: Mint; // :"7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
  ticker: string; // POPCAT
  base?: string; // 233083n bigint
  quote: string; // 233083n bigint
  mc?: string; // "2499770.988302420"
  price?: string; // "0.00255094379765720694730335396417780291575"
  qouteKind: QuoteKind;
};

export type txConfirmedParsedSellTrade = {
  tradeType: 'sell';
  mint: Mint; // :"7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
  ticker: string; // POPCAT
  tokenAmount?: string; // 91371280n
  tokenDecimals?: number; // 9
  quote: string; // 233083n bigint
  pnl?: string; // "0.0213395286195286195286195286195286195286"
  mc?: string; // "2499770.988302420"
  price?: string; // "0.00255094379765720694730335396417780291575"
};

export type txConfirmedParsed = {
  type: CabalUserActivityStreamMessages.txnCb;
  txType: 'confirmed';
  cu: number; // 113076
  signature: string; // "5QhqGRhiue4aRHZdoRSUrVSebBtj2Wo64PktCwJDRuNsw3esE1LQV5NNp3WvfXsSCA9NxSKNvZjgYHJ2Cks6B6uq"
  slotDiff: number; // 1
  tipJito?: string;
  tipsPriority?: string;
  trades: Array<txConfirmedParsedBuyTrade | txConfirmedParsedSellTrade>;
};

export type txFailedParsed = {
  type: CabalUserActivityStreamMessages.txnCb;
  txType: 'failed';
  cu: number; // 113076
  signature: string; // "5QhqGRhiue4aRHZdoRSUrVSebBtj2Wo64PktCwJDRuNsw3esE1LQV5NNp3WvfXsSCA9NxSKNvZjgYHJ2Cks6B6uq"
  slotDiff: number; // 1
  tipJito?: string;
  tipsPriority?: string;
  err: string;
  orderId?: string;
};

export type txLostParsed = {
  type: CabalUserActivityStreamMessages.txnCb;
  txType: 'lost';
  signatures: Array<string>;
  orderId?: string;
};

export type CabalMeta = {
  isReady: boolean;
  shouldSetApiKey: boolean;
};

/*
  Messages to Content
*/
export type FromBackgroundMessageUAConnected = {
  type: CabalMessageType;
  eventName: CabalUserActivityStreamMessages.userActivityConnected;
  meta: CabalMeta;
};

export type FromBackgroundMessageUAError = {
  type: CabalMessageType;
  eventName: CabalUserActivityStreamMessages.userActivityError;
  meta: CabalMeta;
};

export type FromBackgroundMessageUAPong = {
  type: CabalMessageType;
  eventName: CabalUserActivityStreamMessages.userActivityPong;
  meta: CabalMeta;
  data: {
    count: string;
  };
};

export type FromBackgroundMessageUATradeStats = {
  type: CabalMessageType;
  eventName: CabalUserActivityStreamMessages.tradeStats;
  meta: CabalMeta;
  data: TradeStatsParsed;
};

/* TRADES */

export type FromBackgroundMessageTradeConnected = {
  type: CabalMessageType;
  eventName: CabalTradeStreamMessages.tradeConnected;
  meta: CabalMeta;
};

export type FromBackgroundMessageTradePong = {
  type: CabalMessageType;
  eventName: CabalTradeStreamMessages.tradePong;
  meta: CabalMeta;
  data: {
    count: string;
  };
};

export type FromBackgroundMessageTradeEvent = {
  type: CabalMessageType;
  eventName: CabalTradeStreamMessages.tradeEvent;
  meta: CabalMeta;
  data: TradeEventParsed;
};

export type FromBackgroundMessageTradeTokenStatus = {
  type: CabalMessageType;
  eventName: CabalTradeStreamMessages.tokenStatus;
  meta: CabalMeta;
  data: TokenStatusParsed;
};

export type FromBackgroundMessageTradeError = {
  type: CabalMessageType;
  eventName: CabalTradeStreamMessages.tradeError;
  meta: CabalMeta;
};

export type FromBackgroundReadyStatusMessage = {
  type: CabalMessageType;
  eventName: CabalCommonMessages.readyStatus;
  meta: CabalMeta;
};

export type FromBackgroundTxMessage = {
  type: CabalMessageType;
  eventName: CabalUserActivityStreamMessages.txnCb;
  data: txConfirmedParsed | txFailedParsed | txLostParsed;
  meta: CabalMeta;
};

export type FromBackgroundMessage =
  | FromBackgroundTxMessage
  | FromBackgroundReadyStatusMessage
  | FromBackgroundMessageUAError
  | FromBackgroundMessageUAConnected
  | FromBackgroundMessageUAPong
  | FromBackgroundMessageUATradeStats
  | FromBackgroundMessageTradeConnected
  | FromBackgroundMessageTradePong
  | FromBackgroundMessageTradeTokenStatus
  | FromBackgroundMessageTradeEvent
  | FromBackgroundMessageTradeError;

export type MessageListener = (
  message: FromBackgroundMessage,
  sender: any,
  sendResponse: SendResponse,
) => void;

export enum TradeType {
  buy = 'buy',
  sell = 'sell',
  deposit = 'deposit',
  withdraw = 'withdraw',
  migrationStart = 'migrationStart',
  migrationEnd = 'migrationEnd',
  burnLiq = 'burnLiq',
  burnMint = 'burnMint',
}

// Limit
