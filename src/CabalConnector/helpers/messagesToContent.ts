import {
  CabalTradeStreamMessages,
  CabalUserActivityStreamMessages,
  Pong,
  TokenStatus,
  TokenTradeStats,
  TradeEvent,
  UserResponse,
} from '../../../services/cabal-clinet-sdk';
import {
  Confirmed,
  Failed,
  LandedTxnState,
  Lost,
} from '../../../services/cabal-clinet-sdk/cabal/CabalRpc/txncb_pb';
import {
  CabalCommonMessages,
  CabalMessageType,
  CabalMeta,
  FromBackgroundMessageTradeConnected,
  FromBackgroundMessageTradeError,
  FromBackgroundMessageTradeEvent,
  FromBackgroundMessageTradePong,
  FromBackgroundMessageTradeTokenStatus,
  FromBackgroundMessageUAError,
  FromBackgroundMessageUAPong,
  FromBackgroundMessageUATradeStats,
  FromBackgroundReadyStatusMessage,
  FromBackgroundTxMessage,
  txConfirmedParsed,
  txFailedParsed,
  txLostParsed,
} from '../shared/types';
import { config } from '../backgroundConfig';
import {
  parseTokenStatus,
  parseTradeEvent,
  parseTradeStats,
} from './cabalEventsToContentPayload';
import { getTxEventTrades } from './getTxEventTrades';
import { CabalConnectorState } from '../CabalConnector';

const getMetaByState = (state: CabalConnectorState): CabalMeta => ({
  isReady: state.isReady,
  shouldSetApiKey: !state.apiKey,
});

export const tradeStatsUA = ({
  state,
  event,
}: {
  state: CabalConnectorState;
  event: { value: TokenTradeStats };
}): FromBackgroundMessageUATradeStats => {
  const data = parseTradeStats(event);
  return {
    type: CabalMessageType.CabalEvent,
    eventName: CabalUserActivityStreamMessages.tradeStats,
    meta: getMetaByState(state),
    data,
  };
};

export const pongUA = ({
  state,
  eventValue,
}: {
  state: CabalConnectorState;
  eventValue: UserResponse;
}): FromBackgroundMessageUAPong => ({
  type: CabalMessageType.CabalEvent,
  eventName: CabalUserActivityStreamMessages.userActivityPong,
  meta: getMetaByState(state),
  data: {
    count: eventValue.count.count.toString(),
  },
});

export const errorUA = ({
  state,
}: {
  state: CabalConnectorState;
}): FromBackgroundMessageUAError => ({
  type: CabalMessageType.CabalEvent,
  eventName: CabalUserActivityStreamMessages.userActivityError,
  meta: getMetaByState(state),
});

export const tradesConnected = ({
  state,
}: {
  state: CabalConnectorState;
}): FromBackgroundMessageTradeConnected => ({
  type: CabalMessageType.CabalEvent,
  eventName: CabalTradeStreamMessages.tradeConnected,
  meta: getMetaByState(state),
});

export const pongTrades = ({
  state,
  eventValue,
}: {
  state: CabalConnectorState;
  eventValue: UserResponse;
}): FromBackgroundMessageTradePong => ({
  type: CabalMessageType.CabalEvent,
  eventName: CabalTradeStreamMessages.tradePong,
  meta: getMetaByState(state),
  data: { count: eventValue.count.count.toString() },
});

export const tradeTokenStates = ({
  state,
  eventValue,
}: {
  state: CabalConnectorState;
  eventValue: {
    value: { value: TokenStatus };
  };
}): FromBackgroundMessageTradeTokenStatus => ({
  type: CabalMessageType.CabalEvent,
  eventName: CabalTradeStreamMessages.tokenStatus,
  meta: getMetaByState(state),
  data: parseTokenStatus(eventValue),
});

export const tradeEvent = ({
  state,
  eventValue,
}: {
  state: CabalConnectorState;
  eventValue: TradeEvent;
}): FromBackgroundMessageTradeEvent => {
  const data = parseTradeEvent({
    mint: state.mint || '$$$',
    cabalTradeEvent: eventValue,
  });

  if (!data) {
    throw new Error('cant parse trade event', data);
  }

  if (config.showTradeEventLog) {
    console.log('handleTradeEvent', data);
  }

  return {
    type: CabalMessageType.CabalEvent,
    eventName: CabalTradeStreamMessages.tradeEvent,
    meta: getMetaByState(state),
    data,
  };
};

export const tradeError = ({
  state,
}: {
  state: CabalConnectorState;
}): FromBackgroundMessageTradeError => {
  return {
    type: CabalMessageType.CabalEvent,
    eventName: CabalTradeStreamMessages.tradeError,
    meta: getMetaByState(state),
  };
};

export const readyStatus = ({
  state,
}: {
  state: CabalConnectorState;
}): FromBackgroundReadyStatusMessage => ({
  type: CabalMessageType.CabalEvent,
  eventName: CabalCommonMessages.readyStatus,
  meta: getMetaByState(state),
});

// TODO: to cabal service
export const txnCB = ({
  event,
  state,
}: {
  state: CabalConnectorState;
  event: {
    case: string;
    value: LandedTxnState;
  };
}): undefined | FromBackgroundTxMessage => {
  try {
    console.log('#### #### #### handleUAtxnCB', event);

    if (event.value.stateType.case === 'confirmed') {
      const confirmed = event.value.stateType.value as unknown as Confirmed;
      const messageData: txConfirmedParsed = {
        type: event.case as CabalUserActivityStreamMessages.txnCb, // "txnCb"
        txType: event.value.stateType.case, // 'confirmed'
        cu: confirmed.cu, // 113076
        signature: confirmed.signature, // "5QhqGRhiue4aRHZdoRSUrVSebBtj2Wo64PktCwJDRuNsw3esE1LQV5NNp3WvfXsSCA9NxSKNvZjgYHJ2Cks6B6uq"
        slotDiff: confirmed.slotDiff, // 1
        tipJito: confirmed.tips?.jito.toString(),
        tipsPriority: confirmed.tips?.priority.toString(),
        trades: getTxEventTrades(confirmed.trades),
      };
      return {
        type: CabalMessageType.CabalEvent,
        eventName: CabalUserActivityStreamMessages.txnCb,
        meta: getMetaByState(state),
        data: messageData,
      };
    }

    if (event.value.stateType.case === 'failed') {
      const failed = event.value.stateType.value as unknown as Failed;
      const messageData: txFailedParsed = {
        type: event.case as CabalUserActivityStreamMessages.txnCb, // "txnCb"
        txType: event.value.stateType.case, // 'failed'
        cu: failed.cu, // 113076
        signature: failed.signature, // "5QhqGRhiue4aRHZdoRSUrVSebBtj2Wo64PktCwJDRuNsw3esE1LQV5NNp3WvfXsSCA9NxSKNvZjgYHJ2Cks6B6uq"
        slotDiff: failed.slotDiff, // 1
        tipJito: failed.tips?.jito.toString(),
        tipsPriority: failed.tips?.priority.toString(),
        err: failed.err,
        orderId: failed.orderId?.toString(),
      };
      return {
        type: CabalMessageType.CabalEvent,
        eventName: CabalUserActivityStreamMessages.txnCb,
        meta: getMetaByState(state),
        data: messageData,
      };
    }

    if (event.value.stateType.case === 'lost') {
      const lost = event.value.stateType.value as unknown as Lost;
      const messageData: txLostParsed = {
        type: event.case as CabalUserActivityStreamMessages.txnCb, // "txnCb"
        txType: event.value.stateType.case, // 'lost'
        signatures: lost.signatures, // "5QhqGRhiue4aRHZdoRSUrVSebBtj2Wo64PktCwJDRuNsw3esE1LQV5NNp3WvfXsSCA9NxSKNvZjgYHJ2Cks6B6uq"
        orderId: lost.orderId?.toString(),
      };
      return {
        type: CabalMessageType.CabalEvent,
        eventName: CabalUserActivityStreamMessages.txnCb,
        meta: getMetaByState(state),
        data: messageData,
      };
    }
  } catch (error) {
    console.error(`error in handleUserActivityTradeStats`, error);
  }
};
