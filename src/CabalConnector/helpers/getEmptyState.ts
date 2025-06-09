import { CabalConnectorState } from '../types';

export const getEmptyState = () => {
  const newInstance = {
    reconnectTimeout: undefined,
    apiKey: null,
    cabal: null,
    isReady: false,

    isUserActivityConnected: false,
    isTradeConnected: false,
    mint: null,

    setIsReady: function (this: CabalConnectorState, value: boolean) {
      this.isReady = value;
    },
  };

  newInstance.setIsReady = newInstance.setIsReady.bind(newInstance);

  return newInstance;
};
