export const config = {
  apiUrl: 'https://cabalbot.tech:11111',
  reconnectTimeout: 100,

  showUAConnected: true, //  handleUserActivityConnected
  showTradesConnected: true, // handleTradeStreamConnected
  showTradeEventLog: true,
  showTokenStatus: true,
  showSendMessageResponseLog: false, // sendMessageToActiveTab
  showSubscribeTokenReceiveMsg: true, // handleSubscribeTokenMessage
  showTradeStats: true, // handleUserActivityTradeStats
  showReceivedMessages: true, // handleMessagesToBackground
  showStreamConnected: true, // checkConnectionStatus
};
