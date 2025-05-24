import { ConnectError } from '@connectrpc/connect';

import { createGRPCCabalClient } from './cabal';
import { TradeEventResponse } from './cabal/CabalRpc/cabal_pb';
import { CabalConfig } from './cabalEnums';
import { FakeConsole } from './types';
import { fakeConsole } from './utils';

export enum CabalTradeStreamMessages {
  tradeConnected = 'tradeConnected',
  tradeDisconnected = 'tradeDisconnected',

  streamMessage = 'streamMessage',

  tradePing = 'ping',
  tradePong = 'pong',
  tradeError = 'tradeError',

  tradeEvent = 'tradeEvent',
  tokenStatus = 'tokenStatus',
}

export type CabalTradeMessageHandler = (
  message: CabalTradeStreamMessages,
  messagePayload?: unknown,
) => void;

class CabalTradeStream {
  client: ReturnType<typeof createGRPCCabalClient>;
  tradesStream: AsyncIterable<TradeEventResponse> | undefined;
  reconnect: boolean = true;
  private onMessage: CabalTradeMessageHandler;
  private pingUserTimeout: number | undefined;
  private isPinging = false;
  log: Console | FakeConsole;
  onePongReceived: Promise<void> | undefined;
  _resolveOnePong: undefined | (() => void);
  constructor({
    client,
    onMessage,
    debug = false,
  }: {
    client: ReturnType<typeof createGRPCCabalClient>;
    onMessage: CabalTradeMessageHandler;
    debug?: boolean;
  }) {
    this.log = debug ? console : fakeConsole;
    this.client = client;
    this.onMessage = onMessage;
  }

  async start() {
    try {
      this.log.log('start cabal trades stream');
      this.connectTradesUni();
      this.onePongReceived = new Promise((resolve) => {
        this._resolveOnePong = resolve;
      });
      setTimeout(() => this.listenTradeEvents());
      setTimeout(() => this.pingTrade(), 0);
      await this.onePongReceived;
      this.onMessage(CabalTradeStreamMessages.tradeConnected);
    } catch (error) {
      console.error('Trade stream start error', error);
    }
  }

  stop() {
    this.log.log('stop cabal trades stream');
    this.onePongReceived = undefined;
    this.isPinging = false;
    clearTimeout(this.pingUserTimeout);
  }

  connectTradesUni() {
    try {
      this.tradesStream = this.client.tradesUni({});
      this.onMessage(CabalTradeStreamMessages.tradeConnected);
    } catch (error) {
      this.tradesStream = undefined;
      console.error('Error while connecting to [tradesUni]');
    }
  }

  async listenTradeEvents() {
    this.log.log('start listening Trades');
    if (!this.tradesStream) {
      throw new Error('[tradesUni] stream is undefined');
    }

    try {
      for await (const response of this.tradesStream) {
        if (
          response.tradeEventResponseKind.case === 'pong' &&
          this._resolveOnePong
        ) {
          this._resolveOnePong();
        }
        console.log('TRADE', response);
        this.onMessage(CabalTradeStreamMessages.streamMessage, response);
      }
    } catch (error) {
      console.error('Stream error:', error);
      this.onMessage(CabalTradeStreamMessages.tradeError, error);
    }
  }

  async pingTrade() {
    this.log.log('pingTrade');
    this.isPinging = true;

    try {
      const count = BigInt(Date.now());

      const pingResult = await this.client.tradePing({
        count,
      });

      this.log.log('ping Trade Result', pingResult);
    } catch (error) {
      console.error('Ping error:', error);
      if (error instanceof ConnectError) {
        this.tradesStream = undefined;
        this.onMessage(CabalTradeStreamMessages.tradeDisconnected);
        if (this.reconnect) {
          this.log.info('Trades reconnecting');
          setTimeout(() => this.start(), 0);
        }
      }
    } finally {
      this.log.log('ping finally', this.isPinging);
      if (this.isPinging && this.tradesStream) {
        this.pingUserTimeout = setTimeout(
          () => this.pingTrade(),
          CabalConfig.pingTradeInterval,
        ) as unknown as number;
      }
    }
  }
}

export default CabalTradeStream;
