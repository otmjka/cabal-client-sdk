import {
  Buy,
  ParsedTrade,
  Sell,
} from '../../../services/cabal-clinet-sdk/cabal/CabalRpc/txncb_pb';
import {
  txConfirmedParsedBuyTrade,
  txConfirmedParsedSellTrade,
} from '../shared/types';

export const getTxEventTrades = (tradeList: Array<ParsedTrade>) => {
  const resultTrades = [];
  for (let trade of tradeList) {
    const tradeType = trade.tradeType.case;
    const tradeValue = trade.tradeType.value;
    if (tradeType === 'buy') {
      const tradeValueBuy = tradeValue as Buy;
      const tmp: txConfirmedParsedBuyTrade = {
        tradeType,
        mint: tradeValueBuy.mint, // :"7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
        ticker: tradeValueBuy.ticker, // POPCAT
        base: tradeValueBuy.base?.toString(), // 233083n bigint
        quote: tradeValueBuy.quote.toString(), // 233083n bigint
        mc: tradeValueBuy.mc?.value, // "2499770.988302420"
        price: tradeValueBuy.price?.value, // "0.00255094379765720694730335396417780291575"
        qouteKind: tradeValueBuy.qouteKind,
      };
      resultTrades.push(tmp);
    }
    if (tradeType === 'sell') {
      const tradeValueSell = tradeValue as Sell;
      const tmp: txConfirmedParsedSellTrade = {
        tradeType,
        mint: tradeValueSell.mint, // :"7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
        ticker: tradeValueSell.ticker, // POPCAT
        tokenAmount: tradeValueSell.tokens?.amount.toString(), // 91371280n
        tokenDecimals: tradeValueSell.tokens?.decimals, // 9
        quote: tradeValueSell.quote.toString(), // 233083n bigint
        pnl: tradeValueSell.pnl?.value, // "0.0213395286195286195286195286195286195286"
        mc: tradeValueSell.mc?.value, // "2499770.988302420"
        price: tradeValueSell.price?.value, // "0.00255094379765720694730335396417780291575"
      };
      resultTrades.push(tmp);
    }
  }
  return resultTrades;
};
