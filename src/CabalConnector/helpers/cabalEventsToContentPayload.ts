import {
  TokenStatus,
  TokenTradeStats,
  TradeEvent,
} from '../../../services/cabal-clinet-sdk';
import {
  Mint,
  TokenStatusParsed,
  TradeEventParsed,
  TradeStatsParsed,
  TradeType,
} from '../shared/types';

export const parseTradeEvent = ({
  cabalTradeEvent,
  mint,
}: {
  mint: Mint;
  cabalTradeEvent: TradeEvent;
}): TradeEventParsed | undefined => {
  try {
    const timestamp = Date.now();
    const data = (cabalTradeEvent as unknown as any).value.value;
    const tradeType: TradeType = (cabalTradeEvent as unknown as any).value.case;
    const {
      amountSol, // : bigint;
      baseLiq, // : bigint;
      quoteLiq, // : bigint;
      poolKind, // : PoolKind;
    } = data;
    const eventDataValue = {
      type: tradeType,
      value: {
        mint,
        timestamp,
        amountSol: amountSol.toString(), // : bigint;
        baseLiq: baseLiq.toString(), // : bigint;
        quoteLiq: quoteLiq.toString(), // : bigint;
        poolKind: poolKind, // : PoolKind;
      },
    };
    return eventDataValue;
  } catch (error) {
    console.error('error while parsing ', cabalTradeEvent);
  }
};

export const parseTradeStats = (event: {
  value: TokenTradeStats;
}): TradeStatsParsed => {
  const tokenTradeStats = event.value as TokenTradeStats;
  const data = {
    mint: tokenTradeStats.mint,
    tokenBalance: tokenTradeStats.tokenBalance.toString(),
    buyQoute: tokenTradeStats.buyQoute.toString(),
    sellQoute: tokenTradeStats.sellQoute.toString(),
    buyBase: tokenTradeStats.buyBase.toString(),
    sellBase: tokenTradeStats.sellBase.toString(),
    buys: tokenTradeStats.buys,
    sells: tokenTradeStats.sells,
    solBalance: tokenTradeStats.solBalance.toString(),
    lastTradedSlot: tokenTradeStats.lastTradedSlot.toString(),
    tokenDecimals: tokenTradeStats.tokenDecimals,
    qouteKind: tokenTradeStats.qouteKind,
  };
  return data;
};

export const parseTokenStatus = (eventValue: {
  value: { value: TokenStatus };
}): TokenStatusParsed => {
  const tokenStatus = eventValue.value.value;
  return {
    mint: tokenStatus.mint,
    poolId: tokenStatus.poolId,
    poolKind: tokenStatus.poolKind,
    migrationStatus: tokenStatus.migrationStatus,
    supply: tokenStatus.supply.toString(),
    baseLiq: tokenStatus.baseLiq.toString(),
    quoteLiq: tokenStatus.quoteLiq.toString(),
    qouteKind: tokenStatus.qouteKind,
    taxBps: tokenStatus.taxBps,
    ticker: tokenStatus.ticker,
  };
};
