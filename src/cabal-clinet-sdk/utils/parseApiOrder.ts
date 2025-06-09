import {
  AmountCase,
  ApiOrderParsed,
  TargetTypeCase,
} from '../CabalServiceTypes';
import { ApiOrder } from '../index';

export const parseApiOrder = ({
  apiOrder,
  mint,
}: {
  apiOrder: ApiOrder;
  mint: string;
}): ApiOrderParsed => {
  let targetTypeValuePrice;
  let targetTypeValueProfitPerc;
  let targetTypeValuePricePerc;
  let targetTypeValueLocalAth;
  let targetTypeValueDirection;
  let amountPercBps;
  let amountFixed; // bigint

  const targetTypeCase = apiOrder.target?.targetType.case;

  if (targetTypeCase === TargetTypeCase.price) {
    targetTypeValueDirection = apiOrder.target?.targetType.value.direction;
    targetTypeValuePrice = apiOrder.target?.targetType.value.price;
  }

  if (targetTypeCase === TargetTypeCase.profit) {
    targetTypeValueDirection = apiOrder.target?.targetType.value.direction;
    targetTypeValueProfitPerc = apiOrder.target?.targetType.value.profitPerc;
  }

  if (targetTypeCase === TargetTypeCase.movingPerc) {
    targetTypeValueDirection = apiOrder.target?.targetType.value.direction;
    targetTypeValuePricePerc = apiOrder.target?.targetType.value.pricePerc;
    targetTypeValueLocalAth = apiOrder.target?.targetType.value.localAth;
  }

  const amountCase = apiOrder.amount?.amountType.case as AmountCase | undefined;

  if (amountCase === AmountCase.percBps) {
    amountPercBps = apiOrder.amount?.amountType.value as number;
  }

  if (amountCase === AmountCase.fixed) {
    amountFixed = apiOrder.amount?.amountType.value?.toString();
  }

  const trigger = apiOrder.trigger;
  return {
    mint,
    id: apiOrder.id?.toString(),
    slippageBps: apiOrder.slippageBps,
    tip: apiOrder.tip.toString(),
    side: apiOrder.side,
    targetTypeCase: targetTypeCase as TargetTypeCase | undefined,
    targetTypeValuePrice,

    targetTypeValuePricePerc,
    targetTypeValueLocalAth,

    targetTypeValueDirection,

    amountCase,
    amountPercBps,
    amountFixed,

    trigger,
  };
};
