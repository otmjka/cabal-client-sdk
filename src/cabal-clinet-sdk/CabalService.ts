import { EventEmitter } from 'events';
import { createGRPCCabalClient } from './cabal';
import {
  UserResponse,
  TradeEventResponse,
  TradeResponse,
} from './cabal/CabalRpc/cabal_pb';

import CabalStream, { CabalStreamEvents } from './CabalStream';
import {
  CabalStreamEventsHandler,
  streamNames,
  CabalTradeStreamMessages,
  ApiOrderParsed,
} from './CabalServiceTypes';

import { CabalUserActivityStreamMessages, Direction, Side, Trigger } from '.';
import { defaultState } from './cabalEnums';
import { toLamports } from '../../widgets/TradeWidget/helpers/toLamports';
import { ApiOrder } from './cabal/CabalRpc/orders_pb';
import { parseApiOrder } from './utils/parseApiOrder';

class CabalService extends EventEmitter {
  client: ReturnType<typeof createGRPCCabalClient>;
  userActivityStream: CabalStream<UserResponse> | undefined;
  tradesStream: CabalStream<TradeEventResponse> | undefined;
  ready: boolean;
  constructor({ apiKey, apiUrl }: { apiKey: string; apiUrl: string }) {
    super();
    this.client = createGRPCCabalClient({
      apiKey,
      apiUrl,
    });
    this.ready = false;
  }

  createUAStream() {
    this.handleUserActivityMessage = this.handleUserActivityMessage.bind(this);
    // <StreamResponse> <UserResponse>
    this.userActivityStream = new CabalStream<UserResponse>({
      nameStream: streamNames.UA,

      clientConnectToStream: () => this.client.userActivityUni({}),
      clientIsPong: (response: UserResponse) =>
        response.userResponseKind.case === 'pong',

      streamPinger: ({ count }: { count: bigint }) =>
        this.client.userPing({ count }),
      onMessage: this.handleUserActivityMessage,

      debug: true,
    });

    return this.userActivityStream;
  }

  destroyUAStrem() {
    this.ready = false;
    this.userActivityStream?.destroy();
    this.userActivityStream = undefined;
  }

  createTradeStream() {
    this.handleTradeMessage = this.handleTradeMessage.bind(this);

    this.tradesStream = new CabalStream<TradeEventResponse>({
      nameStream: streamNames.TRADE,

      clientConnectToStream: () => this.client.tradesUni({}),
      clientIsPong: (response: TradeEventResponse) =>
        response.tradeEventResponseKind.case === 'pong',

      streamPinger: ({ count }: { count: bigint }) =>
        this.client.tradePing({ count }),

      onMessage: this.handleTradeMessage,

      debug: true,
    });
  }

  destroyTStrem() {
    this.ready = false;
    this.tradesStream?.destroy();
    this.tradesStream = undefined;
  }

  async start() {
    try {
      this.ready = true;
      this.createUAStream();
      await this.userActivityStream?.start();
      this.handleUserActivityMessage(CabalStreamEvents.connected);
      this.createTradeStream();
      await this.tradesStream?.start();
    } catch (error) {
      this.ready = false;
      console.log('Cabal Service Error');
      this.stop();
    }
  }

  stop() {
    this.destroyUAStrem();
    this.destroyTStrem();
  }

  // TODO: https://stackoverflow.com/questions/71200948/how-can-i-validate-a-solana-wallet-address-with-web3js
  // CabalRpc -> SubscribeToken(TokenTradeEventSub) returns (TradeResponse) {}
  async subscribeToken(mint: string): Promise<TradeResponse | undefined> {
    try {
      const result = await this.client.subscribeToken({
        mint,
      });
      console.log('subscribeToken', result);
      return result;
    } catch (error) {
      console.error('subscribeToken', error);
    }
  }
  // CabalRpc -> PlaceLimitOrders
  async placeLimitOrders({
    mint,
    priceOneTokenInSol,
    slippageBps,
    tip,
    targetType = 'price',
    direction,
    side,
    amountType,
    amountValue,
    trigger,
  }: {
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
  }) {
    try {
      const result = await this.client.placeLimitOrders({
        mint, // 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr
        orders: [
          {
            // id?
            slippageBps: slippageBps, // 20
            tip: toLamports(tip), // 0.001 * 1_000_000_000
            target: {
              targetType: {
                case: targetType,
                value: {
                  price: priceOneTokenInSol, // цена в SOL
                  direction,
                },
              },
            },
            side,
            amount: {
              amountType: {
                case: amountType,
                value: amountValue, // 500, // 10%
                // case: 'fixed'
                // value: 1_000_000_000n, // 1 POPCAT, 9 decimals
              },
            },
            // trigger: Trigger.IMMEDIATE,
            trigger,
          },
        ],
      });

      console.log('sell result::::', result);
      return result;
    } catch (error) {
      console.error('error token sell', error);
    }
  }

  // CabalRpc -> MarketSell
  async marketSell({ mint, percents }: { mint: string; percents: number }) {
    try {
      if (percents > 100 || percents <= 0) {
        throw new Error('should be in range of [0;100]');
      }
      const sellParams = {
        amountBps: percents * 100,
        mint,
        slippageBps: defaultState.sell_slippage,
        tip: toLamports(defaultState.sell_tip),
      };
      console.log('### sell params', sellParams);
      const result = await this.client.marketSell(sellParams);

      console.log('sell result::::', result);
      return result;
    } catch (error) {
      console.error('error token sell', error);
    }
  }
  // CabalRpc -> MarketBuy
  async marketBuy({
    amount,
    mint,
  }: {
    amount: number; // [0.5, 1, 2, 5 ]
    mint: string;
  }) {
    try {
      const buyParams = {
        amount: toLamports(amount),
        mint,
        slippageBps: defaultState.buy_slippage,
        tip: toLamports(defaultState.buy_tip),
      };
      console.log('### buy params', buyParams);
      const result = await this.client.marketBuy(buyParams);

      console.log('buy', result);
      return result;
    } catch (error) {
      console.error('token buy', error);
    }
  }
  // CabalRpc -> GetTokenLimitOrders

  async getTokenLimitOrders({
    mint,
  }: {
    mint: string;
  }): Promise<ApiOrderParsed[] | undefined> {
    try {
      const result = await this.client.getTokenLimitOrders({ mint });

      const resultMint = result?.mint;
      const resultOrders = result?.orders.map((order: ApiOrder) => {
        return parseApiOrder({ apiOrder: order, mint: resultMint });
      });
      return resultOrders;
    } catch (error) {
      console.error(`getTokenLimitOrders`, error);
    }
  }
  // CabalRpc -> DeleteLimitOrders

  async deleteLimitOrders({ mint, ids }: { mint: string; ids: string[] }) {
    try {
      const idsn = ids.map((item) => BigInt(item));
      const result = await this.client.deleteLimitOrders({ mint, ids: idsn });
      return result;
    } catch (error) {
      console.error(`deleteLimitOrders`, error);
    }
  }
  /* 
    private 
  */

  handleTradeMessage: CabalStreamEventsHandler = (
    messageType,
    messagePayload,
  ) => {
    if (!this.ready) {
      return;
    }
    switch (messageType) {
      case CabalStreamEvents.connected:
        this.emit(CabalTradeStreamMessages.tradeConnected);
        break;
      case CabalStreamEvents.error:
        console.error('[[CabalService]]: trade stream error');
        this.stop();
        this.emit(CabalTradeStreamMessages.tradeError, messagePayload);
        break;
      case CabalStreamEvents.message:
        this.processTradeMessage(messagePayload as TradeEventResponse);
        break;
      default:
        console.log(
          `[handleUserActivityMessage]: unknown message type ${messageType}`,
        );
    }
  };

  handleUserActivityMessage: CabalStreamEventsHandler = (
    messageType,
    messagePayload,
  ) => {
    if (!this.ready) {
      return;
    }
    switch (messageType) {
      case CabalStreamEvents.connected:
        this.emit(CabalUserActivityStreamMessages.userActivityConnected);
        break;
      case CabalStreamEvents.error:
        console.error('[[CabalService]]: UA stream error');
        this.stop();
        this.emit(
          CabalUserActivityStreamMessages.userActivityError,
          messagePayload,
        );
        break;
      case CabalStreamEvents.message:
        this.processUserActivityMessage(messagePayload as UserResponse);
        break;
      default:
        console.log(
          `[handleUserActivityMessage]: unknown message type ${messageType}`,
        );
    }
  };

  processUserActivityMessage(message: UserResponse) {
    const messageCase = message.userResponseKind.case;
    switch (messageCase) {
      case 'tradeStatus':
        break;
      case 'tradeStats':
        this.emit(
          CabalUserActivityStreamMessages.tradeStats,
          message.userResponseKind,
        );
        break;
      case 'txnCb':
        this.emit(
          CabalUserActivityStreamMessages.txnCb,
          message.userResponseKind,
        );
        break;
      case 'ping':
        break;
      case 'pong':
        this.emit(CabalUserActivityStreamMessages.userActivityPong, {
          count: message.userResponseKind.value,
        });
        break;
      default:
        console.log(
          `[handleUserActivityMessage]: unknown case message: ${messageCase}`,
        );
    }
  }

  processTradeMessage(message: TradeEventResponse) {
    const messageCase = message.tradeEventResponseKind.case;
    switch (messageCase) {
      case 'tradeEvent':
        this.emit(CabalTradeStreamMessages.tradeEvent, {
          value: message.tradeEventResponseKind.value.tradeEventKind,
        });
        break;
      case 'tokenStatus':
        this.emit(CabalTradeStreamMessages.tokenStatus, {
          value: message.tradeEventResponseKind,
        });
        break;
      case 'ping':
        this.emit(CabalTradeStreamMessages.tradePing, {
          value: message.tradeEventResponseKind.value,
        });
        break;
      case 'pong':
        this.emit(CabalTradeStreamMessages.tradePong, {
          count: message.tradeEventResponseKind.value,
        });
        break;
      default:
        console.log(
          `[processTradeMessage]: unknown case message: ${messageCase}`,
        );
    }
  }
}

export default CabalService;
