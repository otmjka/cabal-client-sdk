import { createEffect } from 'solid-js';
import { setCabalUserActivity } from '../stores/cabalUserActivity';

import {
  CabalUserActivityStreamMessages,
  CabalTradeStreamMessages,
  Direction,
  Side,
  Trigger,
} from './cabal-clinet-sdk';
import { setCabalTradeStream } from '../stores/cabalTradeSreamStore';
import { CabalConnector } from './CabalConnector';
import { getEmptyState } from './CabalConnector/helpers/getEmptyState';
import { CabalConnectorState } from './CabalConnector/types';
import { MessageHandler } from './CabalConnector/CabalConnector';
import { contentAppStore, setContentAppStore } from '../stores/contentAppStore';
import {
  CabalCommonMessages,
  FromBackgroundMessageTradeEvent,
  FromBackgroundMessageTradePong,
  FromBackgroundMessageTradeTokenStatus,
  FromBackgroundMessageUAPong,
} from './CabalConnector/shared/types';
import { addLogRecord, setLogStore } from '../stores/logStore';
import { addToast } from '../stores/toastStore';
import { setTradeWidgetState } from '../widgets/TradeWidget/TradeWidgetStore/tradeWidgetStateStore';
import { CabalStorage } from './CabalStorage';

const onMessageHandler: MessageHandler = ({ message, state }) => {
  const messageType = message?.type;
  const messageEventName = message?.eventName;

  // messageMeta to app status
  const { isReady, shouldSetApiKey } = message.meta;
  setContentAppStore('isReady', isReady);
  setContentAppStore('shouldSetApiKey', shouldSetApiKey);

  switch (messageEventName) {
    case CabalCommonMessages.readyStatus:
      console.log(`%%%% %%% ${CabalCommonMessages.readyStatus}`, message);
      addLogRecord(message);

      const isReady = message.meta.isReady;
      const status = message.meta.isReady
        ? { isReady, count: String(Date.now()) }
        : undefined;
      setCabalUserActivity('status', status);
      setCabalTradeStream('status', status);
      break;
    case CabalUserActivityStreamMessages.txnCb:
      console.log(`$$$ ${CabalCommonMessages.readyStatus}`, message);
      // handleUAtxCB(message);
      addLogRecord(message);
      addToast(message);
      break;
    case CabalUserActivityStreamMessages.userActivityConnected:
      setCabalUserActivity('status', { isReady: true, count: '' });
      break;
    case CabalUserActivityStreamMessages.userActivityPong:
      setCabalUserActivity('status', {
        isReady: message.meta.isReady,
        count: (message as FromBackgroundMessageUAPong).data.count,
      });
      break;
    case CabalUserActivityStreamMessages.tradeStats:
      console.log('!!!!!!!handleUserActivityTradeStats', event);
      setLogStore('logs', (prev) => [
        ...prev,
        { type: 'tokenTradeStats', event: message },
      ]);
      setTradeWidgetState('tradeStats', message.data);
      break;
    case CabalUserActivityStreamMessages.userActivityError:
      setCabalUserActivity('status', undefined);
      break;
    // trade streams
    case CabalTradeStreamMessages.tradeConnected:
      setCabalTradeStream('status', { isReady: true, count: '' });
      break;
    case CabalTradeStreamMessages.tradePong:
      setCabalTradeStream('status', {
        isReady: message.meta.isReady,
        count: (message as FromBackgroundMessageTradePong).data.count,
      });
      break;
    case CabalTradeStreamMessages.tradeEvent:
      console.log('### ---- CabalTradeStreamMessages.tradeEvent', message);
      // setLogStore('logs', (prev) => [
      //   ...prev,
      //   { type: 'tradeEvent', event: message },
      // ]);

      const messageValue = (message as FromBackgroundMessageTradeEvent).data;
      setTradeWidgetState('lastTradeEvent', messageValue);

      setTradeWidgetState('baseLiq', messageValue.value.baseLiq);
      setTradeWidgetState('quoteLiq', messageValue.value.quoteLiq);
      break;
    case CabalTradeStreamMessages.tokenStatus:
      setLogStore('logs', (prev) => [
        ...prev,
        { type: 'tokenStatus', event: message },
      ]);
      const messageData = (message as FromBackgroundMessageTradeTokenStatus)
        .data;
      setTradeWidgetState('tokenStatus', messageData);
      setTradeWidgetState('baseLiq', messageData.baseLiq);
      setTradeWidgetState('quoteLiq', messageData.quoteLiq);
      break;
    case CabalTradeStreamMessages.tradeError:
      setCabalTradeStream('status', undefined);
      break;

    default:
      console.log(`unknown message: ${messageType}`);
  }
};
const cabalStorage = new CabalStorage({ storageKey: 'solidjs-proba' });
const apiKey = cabalStorage.getApiKey();
const state: CabalConnectorState = getEmptyState();
state.apiKey = apiKey;
const cabalConnector = new CabalConnector({
  state,
  onMessage: onMessageHandler,
});

export function useCabalService() {
  let first = true;

  createEffect(() => {
    if (!first) {
      return;
    }

    setContentAppStore('shouldSetApiKey', !state.apiKey);
  });

  createEffect(() => {
    if (!first) {
      return;
    }

    if (contentAppStore.shouldSetApiKey || !state.apiKey) {
      console.log('no api key');
      return;
    }
    cabalConnector.initializeCabalService();
    first = false;
  });

  const handleSetApiKey = (apiKey: string) => {
    state.apiKey = apiKey;
    cabalStorage.setApiKey(state.apiKey);
  };

  return { onSetKey: handleSetApiKey };
}

export function useSubscribeToken() {
  return (mint: string) => state.cabal?.subscribeToken(mint);
}

export function useMarketBuy() {
  return ({ amount, mint }: { amount: number; mint: string }) =>
    state.cabal?.marketBuy({ amount, mint });
}

export const getTokenLimitOrders = async ({ mint }: { mint: string }) => {
  try {
    return state.cabal?.getTokenLimitOrders({ mint });
  } catch (error) {
    console.error('getTokenLimitOrders', error);
  }
};

export const deleteLimitOrders = async ({
  mint,
  ids,
}: {
  mint: string;
  ids: string[];
}) => {
  try {
    return state.cabal?.deleteLimitOrders({ mint, ids });
  } catch (error) {
    console.error('deleteLimitOrders', error);
  }
};

export const placeLimitOrder = async (item: {
  mint: string;
  slippageBps: number;
  tip: number;
  targetType: 'price';
  priceOneTokenInSol: number;
  direction: Direction;
  side: Side;
  amountType: 'percBps';
  amountValue: number;
  trigger: Trigger;
}) => {
  // slippageBps: defaultState.sell_slippage, // 20
  // tip: toLamports(defaultState.sell_tip), // 0.001 * 1_000_000_000
  // price: 0.0027, // цена в SOL
  //                   direction: Direction.ABOVE,
  // side: Side.SELL,
  // case: 'percBps',
  // value: 500, // 10%

  return state.cabal?.placeLimitOrders({
    mint: item.mint,
    slippageBps: item.slippageBps,
    tip: item.tip,
    targetType: item.targetType,
    priceOneTokenInSol: item.priceOneTokenInSol,
    direction: item.direction,
    side: item.side,
    amountType: item.amountType,
    amountValue: item.amountValue,
    trigger: item.trigger,
  });
};

export const marketBuy = async ({
  amount,
  mint,
}: {
  amount: number;
  mint: string;
}) => {
  return state.cabal?.marketBuy({ amount, mint });
};

export const marketSell = async ({
  mint,
  percents,
}: {
  mint: string;
  percents: number;
}) => {
  return state.cabal?.marketSell({ mint, percents });
};

export function useMarketSell() {
  return ({ mint, percents }: { mint: string; percents: number }) =>
    state.cabal?.marketSell({ mint, percents });
}

export function usePlaceLimitOrders() {
  return ({ mint }: { mint: string }) =>
    state.cabal?.placeLimitOrders({ mint });
}
