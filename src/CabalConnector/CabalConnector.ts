import {
  CabalService,
  CabalTradeStreamMessages,
  CabalUserActivityStreamMessages,
  TokenStatus,
  TokenTradeStats,
  TradeEvent,
  UserResponse,
} from '../../services/cabal-clinet-sdk';
import { config } from './backgroundConfig';

import * as messagesToContent from './helpers/messagesToContent';
import { ConnectError } from '@connectrpc/connect';
import { CabalStreamErrors } from '../../services/cabal-clinet-sdk/CabalStream';
import { LandedTxnState } from '../../services/cabal-clinet-sdk/cabal/CabalRpc/txncb_pb';
import { CabalConnectorState } from './types';
import { FromBackgroundMessage } from './shared/types';

export type MessageHandler = (params: {
  message: FromBackgroundMessage;
  state: CabalConnectorState;
}) => void;

class CabalConnector {
  state: CabalConnectorState;
  sendMessageToClient: MessageHandler;
  constructor({
    state,
    onMessage,
  }: {
    state: CabalConnectorState;
    onMessage: MessageHandler;
  }) {
    this.state = state;
    this.sendMessageToClient = onMessage;
    this.scheduleReconnect = this.scheduleReconnect.bind(this);
    this.initializeCabalService = this.initializeCabalService.bind(this);
    this.cleanCabalService = this.cleanCabalService.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.eventDict = this.eventDict.bind(this);
    this.checkConnectionStatus = this.checkConnectionStatus.bind(this);

    this.handleUserActivityConnected =
      this.handleUserActivityConnected.bind(this);
    this.handleUserActivityPong = this.handleUserActivityPong.bind(this);
    this.handleUserActivityTradeStats =
      this.handleUserActivityTradeStats.bind(this);
    this.handleUAtxnCB = this.handleUAtxnCB.bind(this);
    this.handleUAError = this.handleUAError.bind(this);

    // trades
    this.handleTradeStreamConnected =
      this.handleTradeStreamConnected.bind(this);
    this.handleTradeStreamPong = this.handleTradeStreamPong.bind(this);
    this.handleTradeTokenStatus = this.handleTradeTokenStatus.bind(this);
    this.handleTradeEvent = this.handleTradeEvent.bind(this);
    this.handleTradeError = this.handleTradeError.bind(this);
  }

  scheduleReconnect() {
    this.cleanCabalService();

    // Schedule reconnect
    this.state.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.initializeCabalService();
    }, config.reconnectTimeout);
  }

  async initializeCabalService() {
    try {
      console.log('initializeCabalService', this.state.apiKey);

      this.cleanCabalService();

      // const apiKey = await state.cabalStorage.getApiKey();
      // state.apiKey = apiKey.apiKey;
      console.log('###', this.state.apiKey);

      if (!this.state.apiKey) {
        console.log('no api key');
        return;
      }
      this.state.cabal = new CabalService({
        apiKey: this.state.apiKey,
        apiUrl: config.apiUrl,
      });

      this.subscribe();
      this.state.cabal.start();
    } catch (error) {
      console.error(`initializeCabalService`, error);
    }
  }

  cleanCabalService() {
    try {
      this.state.isReady = false;
      // Clear any existing reconnect timeout
      if (this.state.reconnectTimeout) {
        clearTimeout(this.state.reconnectTimeout);
      }

      // Reset connection flags
      this.state.isUserActivityConnected = false;
      this.state.isTradeConnected = false;

      if (this.state.cabal) {
        this.unsubscribe();
        this.state.cabal.stop();
        this.state.cabal = null;
      }
      // TODO: replace
      this.sendMessageToClient({
        state: this.state,
        message: messagesToContent.readyStatus({ state: this.state }),
      });
    } catch (error) {
      console.error(`cleanCabalService`, error);
    }
  }

  subscribe() {
    if (!this.state.cabal) {
      console.log('no cabal instance');
      return;
    }
    for (let [eventName, eventHandler] of Object.entries(this.eventDict())) {
      this.state.cabal.on(eventName, eventHandler);
    }
  }

  unsubscribe() {
    if (!this.state.cabal) {
      console.log('no cabal instance');
      return;
    }
    for (let [eventName, eventHandler] of Object.entries(this.eventDict())) {
      this.state.cabal.off(eventName, eventHandler);
    }
  }

  checkConnectionStatus() {
    if (this.state.isUserActivityConnected && this.state.isTradeConnected) {
      this.state.setIsReady(true);
      if (config.showStreamConnected) {
        console.log('Both streams connected successfully');
      }
      this.sendMessageToClient({
        state: this.state,
        message: messagesToContent.readyStatus({ state: this.state }),
      });
      // Additional logic for successful connection if needed
    }
  }

  eventDict() {
    return {
      [CabalUserActivityStreamMessages.userActivityConnected]:
        this.handleUserActivityConnected,
      [CabalUserActivityStreamMessages.userActivityPong]:
        this.handleUserActivityPong,

      [CabalUserActivityStreamMessages.tradeStats]:
        this.handleUserActivityTradeStats,
      [CabalUserActivityStreamMessages.txnCb]: this.handleUAtxnCB,

      [CabalUserActivityStreamMessages.userActivityError]: this.handleUAError,

      // trade streams
      [CabalTradeStreamMessages.tradeConnected]:
        this.handleTradeStreamConnected,
      [CabalTradeStreamMessages.tradePong]: this.handleTradeStreamPong,
      [CabalTradeStreamMessages.tokenStatus]: this.handleTradeTokenStatus,

      [CabalTradeStreamMessages.tradeEvent]: this.handleTradeEvent,
      [CabalTradeStreamMessages.tradeError]: this.handleTradeError,
    };
  }

  handleUserActivityConnected() {
    if (config.showUAConnected) {
      console.log('UA CONNECTED');
    }
    this.state.isUserActivityConnected = true;
    this.checkConnectionStatus();
  }

  handleUserActivityPong(eventValue: UserResponse) {
    try {
      console.log('------handleUserActivityPong', eventValue);
      this.sendMessageToClient({
        state: this.state,
        message: messagesToContent.pongUA({ state: this.state, eventValue }),
      });
    } catch (error) {
      console.error('error in handleUserActivityPong', error);
    }
  }

  handleUserActivityTradeStats(event: { value: TokenTradeStats }) {
    try {
      if (config.showTradeStats) {
        console.log('handleUserActivityTradeStats', event);
      }

      this.sendMessageToClient({
        state: this.state,
        message: messagesToContent.tradeStatsUA({ event, state: this.state }),
      });
    } catch (error) {
      console.error(`error in handleUserActivityTradeStats`, error);
    }
  }

  handleUAtxnCB(event: { case: string; value: LandedTxnState }) {
    try {
      console.log('#### #### #### handleUAtxnCB', event);
      const message = messagesToContent.txnCB({ event, state: this.state });
      console.log('#### #### #### handleUAtxnCB-message', message);
      if (!message) {
        throw new Error('message cant parsed');
      }
      this.sendMessageToClient({
        state: this.state,
        message,
      });
    } catch (error) {
      console.error(`error in handleUserActivityTradeStats`, error);
    }
  }

  async handleUAError(error: Error) {
    console.error('User Activity Stream Error', error);
    if (
      error instanceof ConnectError &&
      error.rawMessage === CabalStreamErrors.BadAuth
    ) {
      this.state.apiKey = null;
      // await this.state.cabalStorage.setApiKey({ apiKey: null });
    } else {
      this.scheduleReconnect();
    }
    console.log('state::::', this.state);
    this.sendMessageToClient({
      state: this.state,
      message: messagesToContent.errorUA({ state: this.state }),
    });
  }

  /*
    Trades
  */

  handleTradeStreamConnected() {
    if (config.showTradesConnected) {
      console.log('Trades CONNECTED');
    }
    this.state.isTradeConnected = true;
    this.checkConnectionStatus();
    this.sendMessageToClient({
      state: this.state,
      message: messagesToContent.tradesConnected({ state: this.state }),
    });
  }

  handleTradeStreamPong(eventValue: UserResponse) {
    const message = messagesToContent.pongTrades({
      state: this.state,
      eventValue,
    });
    this.sendMessageToClient({ state: this.state, message });
  }

  handleTradeTokenStatus(eventValue: { value: { value: TokenStatus } }) {
    try {
      if (config.showTokenStatus) {
        console.log('handleTradeTokenStatus', eventValue);
      }
      const message = messagesToContent.tradeTokenStates({
        state: this.state,
        eventValue,
      });
      this.sendMessageToClient({ state: this.state, message });
    } catch (error) {
      console.error(`error in handleTradeTokenStatus`, error);
    }
  }

  handleTradeEvent(eventValue: TradeEvent) {
    try {
      console.log('trade event');
      const message = messagesToContent.tradeEvent({
        state: this.state,
        eventValue,
      });
      this.sendMessageToClient({ state: this.state, message });
    } catch (error) {
      console.error(`error in handleTradeEvent`, error);
    }
  }

  handleTradeError = () => {
    console.error('Trade Stream Error');
    this.scheduleReconnect();
    const message = messagesToContent.tradeError({ state: this.state });
    this.sendMessageToClient({ state: this.state, message });
  };
}

export default CabalConnector;
