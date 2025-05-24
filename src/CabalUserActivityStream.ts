import { ConnectError } from '@connectrpc/connect';

import { FakeConsole } from './types';
import { fakeConsole } from './utils';

import { createGRPCCabalClient } from './cabal';
import { CabalConfig } from './cabalEnums';
import { UserResponse } from './cabal/CabalRpc/cabal_pb';

export enum CabalUserActivityStreamMessages {
  userActivityConnected = 'userActivityConnected',
  userActivityDisconnected = 'userActivityDisconnected',

  streamMessage = 'streamMessage',

  userActivityPong = 'pong',
  userActivityError = 'userActivityError',

  tradeStats = 'tradeStats',
}

export type CabalUserActivityMessageHandler = (
  message: CabalUserActivityStreamMessages,
  messagePayload?: unknown,
) => void;

class CabalUserActivityStream {
  client: ReturnType<typeof createGRPCCabalClient>;
  userActivityStream: AsyncIterable<UserResponse> | undefined;
  reconnect: boolean = true;
  private onMessage: CabalUserActivityMessageHandler;
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
    onMessage: CabalUserActivityMessageHandler;
    debug?: boolean;
  }) {
    this.log = debug ? console : fakeConsole;
    this.client = client;
    this.onMessage = onMessage;
  }

  async start() {
    try {
      this.log.log('start cabal UAStream');
      this.connectUserActivityUni();
      this.onePongReceived = new Promise((resolve) => {
        this._resolveOnePong = resolve;
      });
      setTimeout(() => this.listenUserActivity());
      setTimeout(() => this.pingUser(), 0);
      await this.onePongReceived;
      this.onMessage(CabalUserActivityStreamMessages.userActivityConnected);
    } catch (error) {
      console.error('UA stream start error', error);
    }
  }

  stop() {
    this.log.log('stop cabal UAStream');
    this.onePongReceived = undefined;
    this.isPinging = false;
    clearTimeout(this.pingUserTimeout);
  }

  connectUserActivityUni() {
    try {
      this.log.log('connect UAStream');
      this.userActivityStream = this.client.userActivityUni({});
    } catch (error) {
      this.userActivityStream = undefined;
      console.error('Error while connecting to [userActivityUni]');
    }
  }

  async listenUserActivity() {
    this.log.log('start listening UAStream');
    if (!this.userActivityStream) {
      throw new Error('[userActivityUni] stream is undefined');
    }

    try {
      for await (const response of this.userActivityStream) {
        if (response.userResponseKind.case === 'pong' && this._resolveOnePong) {
          this._resolveOnePong();
        }
        // response.userResponseKind.case !== 'pong' &&
        this.log.log('UA', response);
        this.onMessage(CabalUserActivityStreamMessages.streamMessage, response);
      }
    } catch (error) {
      console.error('Stream error:', error);
      this.onMessage(CabalUserActivityStreamMessages.userActivityError, error);
    }
  }

  async pingUser() {
    this.log.log('pingUser');
    this.isPinging = true;

    try {
      const count = BigInt(Date.now());

      const pingResult = await this.client.userPing({
        count,
      });

      this.log.log('ping UA Result', pingResult);
    } catch (error) {
      console.error('Ping error:', error);
      if (error instanceof ConnectError) {
        this.userActivityStream = undefined;
        this.onMessage(
          CabalUserActivityStreamMessages.userActivityDisconnected,
        );
        if (this.reconnect) {
          this.log.info('UA reconnecting');
          setTimeout(() => this.start(), 0);
        }
      }
    } finally {
      this.log.log('UA ping finally', this.isPinging);
      if (this.isPinging && this.userActivityStream) {
        this.pingUserTimeout = setTimeout(
          () => this.pingUser(),
          CabalConfig.pingUserInterval,
        ) as unknown as number;
      }
    }
  }
}

export default CabalUserActivityStream;
