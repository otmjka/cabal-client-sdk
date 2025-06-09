import { CabalService } from '../cabal-clinet-sdk';

export type CabalConnectorState = {
  reconnectTimeout: number | undefined;
  apiKey: string | null;
  cabal: CabalService | null;
  isReady: boolean;

  isUserActivityConnected: boolean;
  isTradeConnected: boolean;
  mint: string | null;

  setIsReady: (value: boolean) => void;
};
