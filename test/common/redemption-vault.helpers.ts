import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { OptionalCommonParams, getAccount } from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
  ERC20,
  // eslint-disable-next-line camelcase
  ERC20__factory,
  RedemptionVault,
} from '../../typechain-types';

type CommonParamsRedeem = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'redemptionVault' | 'owner' | 'mTBILL' | 'mTokenToUsdDataFeed'
>;

type CommonParams = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'redemptionVault' | 'owner'
>;

export const redeemInstantTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
  }: CommonParamsRedeem & { waivedFee?: boolean },
  tokenOut: ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(tokenOut, owner);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountTBillIn.toString());
  const tokensReceiver = await redemptionVault.tokensReceiver();
  const feeReceiver = await redemptionVault.feeReceiver();

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(sender).redeemInstant(tokenOut, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const balanceBeforeTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyBefore = await mTBILL.totalSupply();

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { fee, amountOut, amountInWithoutFee } =
    await calcExpectedTokenOutAmount(
      sender,
      tokenContract,
      redemptionVault,
      mTokenRate,
      amountIn,
      true,
    );

  await expect(
    redemptionVault.connect(sender).redeemInstant(tokenOut, amountIn),
  )
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'RedeemInstant(address,address,uint256,uint256,uint256)'
      ].name,
    )
    .withArgs(sender, tokenOut, amountTBillIn, fee, amountOut).to.not.reverted;

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const balanceAfterTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyAfter = await mTBILL.totalSupply();

  expect(supplyAfter).eq(supplyBefore.sub(amountInWithoutFee));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver.add(fee));
  expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut.add(amountOut));
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
};

export const redeemRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
  }: CommonParamsRedeem & { waivedFee?: boolean },
  tokenOut: ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(tokenOut, owner);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountTBillIn.toString());
  const tokensReceiver = await redemptionVault.tokensReceiver();
  const feeReceiver = await redemptionVault.feeReceiver();

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(sender).redeemRequest(tokenOut, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const balanceBeforeTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyBefore = await mTBILL.totalSupply();

  const latestRequestIdBefore = await redemptionVault.lastRequestId();
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { fee, currentStableRate, amountInWithoutFee } =
    await calcExpectedTokenOutAmount(
      sender,
      tokenContract,
      redemptionVault,
      mTokenRate,
      amountIn,
      false,
    );

  await expect(
    redemptionVault.connect(sender).redeemRequest(tokenOut, amountIn),
  )
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'RedeemRequest(uint256,address,address,uint256)'
      ].name,
    )
    .withArgs(latestRequestIdBefore.add(1), sender, tokenOut, amountTBillIn).to
    .not.reverted;

  const latestRequestIdAfter = await redemptionVault.lastRequestId();
  const request = await redemptionVault.redeemRequests(latestRequestIdAfter);

  expect(request.sender).eq(sender.address);
  expect(request.tokenOut).eq(tokenOut);
  expect(request.amountMToken).eq(amountInWithoutFee);
  expect(request.mTokenRate).eq(mTokenRate);
  expect(request.tokenOutRate).eq(currentStableRate);

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);

  const balanceAfterTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyAfter = await mTBILL.totalSupply();

  expect(supplyAfter).eq(supplyBefore);
  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterContract).eq(
    balanceBeforeContract.add(amountInWithoutFee),
  );
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver.add(fee));
  expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut);
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
};

export const setMinFiatRedeemAmountTest = async (
  { redemptionVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setMinFiatRedeemAmount(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setMinFiatRedeemAmount(value),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetMinFiatRedeemAmount(address,uint256)']
      .name,
  ).to.not.reverted;

  const newMin = await redemptionVault.minFiatRedeemAmount();
  expect(newMin).eq(value);
};

const getFeePercent = async (
  sender: string,
  token: string,
  redemptionVault: RedemptionVault,
  isInstant: boolean,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token);
  let feePercent = constants.Zero;
  const isWaived = await redemptionVault.waivedFeeRestriction(sender);
  if (!isWaived) {
    feePercent = tokenConfig.fee;
    if (isInstant) {
      const instantFee = await redemptionVault.initialFee();
      feePercent = feePercent.add(instantFee);
    }
  }
  return feePercent;
};

const calcExpectedTokenOutAmount = async (
  sender: SignerWithAddress,
  token: ERC20,
  redemptionVault: RedemptionVault,
  mTokenRate: BigNumber,
  amountIn: BigNumber,
  isInstant: boolean,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token.address);
  // eslint-disable-next-line camelcase
  const dataFeedContract = DataFeedTest__factory.connect(
    tokenConfig.dataFeed,
    sender,
  );
  const currentStableRate = await dataFeedContract.getDataInBase18();
  if (currentStableRate.isZero())
    return {
      amountOut: constants.Zero,
      amountInWithoutFee: constants.Zero,
      fee: constants.Zero,
      currentStableRate: constants.Zero,
    };

  const feePercent = await getFeePercent(
    sender.address,
    token.address,
    redemptionVault,
    isInstant,
  );

  const hundredPercent = await redemptionVault.ONE_HUNDRED_PERCENT();
  const fee = amountIn.mul(feePercent).div(hundredPercent);

  const amountInWithoutFee = amountIn.sub(fee);

  const tokenDecimals = await token.decimals();

  const amountOut = amountInWithoutFee
    .mul(mTokenRate)
    .div(currentStableRate)
    .div(10 ** (18 - tokenDecimals));

  return {
    amountOut,
    amountInWithoutFee,
    fee,
    currentStableRate,
  };
};
