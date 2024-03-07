import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { OptionalCommonParams, getAccount } from './common.helpers';
import { defaultDeploy } from './fixtures';

import { ERC20 } from '../../typechain-types';

type CommonParamsDeposit = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'redemptionVault' | 'owner' | 'stUSD'
>;

export const redeem = async (
  { redemptionVault, owner, stUSD }: CommonParamsDeposit,
  tokenOut: ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountTBillIn.toString());
  const tokensReceiver = await redemptionVault.tokensReceiver();

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(sender).redeem(tokenOut, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeUser = await stUSD.balanceOf(sender.address);
  const balanceBeforeReceiver = await stUSD.balanceOf(tokensReceiver);

  const supplyBefore = await stUSD.totalSupply();

  const lastReqId = await redemptionVault.lastRequestId();

  await expect(redemptionVault.connect(sender).redeem(tokenOut, amountIn))
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'Redeem(uint256,address,address,uint256)'
      ].name,
    )
    .withArgs(lastReqId.add(1), sender, tokenOut, amountTBillIn).to.not
    .reverted;
  const newLastReqId = await redemptionVault.lastRequestId();

  const balanceAfterUser = await stUSD.balanceOf(sender.address);
  const balanceAfterReceiver = await stUSD.balanceOf(tokensReceiver);

  const supplyAfter = await stUSD.totalSupply();

  expect(newLastReqId).eq(lastReqId.add(1));
  expect(supplyAfter).eq(supplyBefore);
  expect(await stUSD.balanceOf(redemptionVault.address)).eq(0);
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver.add(amountIn));
};
