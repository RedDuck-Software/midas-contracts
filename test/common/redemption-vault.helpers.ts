import { expect } from 'chai';
import { BigNumberish, Signer } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  Account,
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
} from './common.helpers';
import { getRoundData, setRoundData } from './data-feed.helpers';
import { defaultDeploy } from './fixtures';

import {
  // eslint-disable-next-line camelcase
  AggregatorV3Mock__factory,
  // eslint-disable-next-line camelcase
  DataFeed__factory,
  ERC20,
  // eslint-disable-next-line camelcase
  ERC20__factory,
} from '../../typechain-types';

type CommonParams = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'redemptionVault' | 'owner'
>;

type CommonParamsDeposit = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'redemptionVault' | 'owner' | 'stUSD'
>;

type CommonParamsGetOutputAmount = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'redemptionVault' | 'mockedAggregator'
>;

export const setMinAmountToRedeemTest = async (
  { redemptionVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setMinAmountToRedeem(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setMinAmountToRedeem(value),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetMinAmountToRedeem(address,uint256)']
      .name,
  ).to.not.reverted;

  const newMin = await redemptionVault.minUsdAmountToRedeem();
  expect(newMin).eq(value);
};

export const initiateRedemptionRequestTest = async (
  { redemptionVault, owner, stUSD }: CommonParamsDeposit,
  tokenOut: ERC20 | string,
  amountStUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountStUsdIn.toString());

  if (opt?.revertMessage) {
    await expect(
      redemptionVault
        .connect(sender)
        .initiateRedemptionRequest(tokenOut, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeUser = await stUSD.balanceOf(sender.address);

  const supplyBefore = await stUSD.totalSupply();

  const fee = await redemptionVault.getFee();
  const feeAmount = amountIn.sub(amountIn.sub(fee.mul(amountIn).div(10000)));

  await expect(
    redemptionVault
      .connect(sender)
      .initiateRedemptionRequest(tokenOut, amountIn),
  )
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'InitiateRequest(uint256,address,address,uint256)'
      ].name,
    )
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events['FeeCollected(uint256,address,uint256)']
        .name,
    )
    .withArgs(await redemptionVault.lastRequestId(), sender, feeAmount).to.not
    .reverted;

  const lastRequestId = await redemptionVault.lastRequestId();

  const request = await redemptionVault.requests(lastRequestId);

  const balanceAfterUser = await stUSD.balanceOf(sender.address);

  const supplyAfter = await stUSD.totalSupply();

  expect(request.exists).eq(true);
  expect(request.user).eq(sender.address);
  expect(request.fee).eq(feeAmount);
  expect(request.tokenOut).eq(tokenOut);
  expect(request.amountStUsdIn).eq(amountIn.sub(feeAmount));

  expect(supplyAfter).eq(supplyBefore.sub(amountIn));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
};

export const fulfillRedemptionRequestTest = (
  { redemptionVault, owner, stUSD }: CommonParamsDeposit,
  opt?: OptionalCommonParams,
) => {
  return {
    'fulfillRedemptionRequest(uint256,uint256)': async (
      requestId: BigNumberish,
      amountUsdOut: number,
    ) => {
      const sender = opt?.from ?? owner;
      const amountOut = parseUnits(amountUsdOut.toString());

      if (opt?.revertMessage) {
        await expect(
          redemptionVault
            .connect(sender)
            .fulfillRedemptionRequest(requestId, amountOut),
        ).revertedWith(opt?.revertMessage);
        return;
      }

      const balanceBeforeStUsdUser = await stUSD.balanceOf(sender.address);

      let request = await redemptionVault.requests(requestId);

      // eslint-disable-next-line camelcase
      const tokenContract = ERC20__factory.connect(request.tokenOut, owner);
      const isManualFillToken =
        request.tokenOut === ethers.constants.AddressZero;

      const balanceBeforeContract = await balanceOfBase18(
        tokenContract,
        redemptionVault.address,
      );

      const balanceBeforeUser = await balanceOfBase18(
        tokenContract,
        request.user,
      );

      const expectedOutAmount = amountOut;

      await expect(
        redemptionVault
          .connect(sender)
          .fulfillRedemptionRequest(requestId, amountOut),
      ).to.emit(
        redemptionVault,
        redemptionVault.interface.events[
          'FulfillRequest(address,uint256,uint256)'
        ].name,
      ).to.not.reverted;

      const balanceAfterStUsdUser = await stUSD.balanceOf(sender.address);

      const balanceAfterContract = await balanceOfBase18(
        tokenContract,
        redemptionVault.address,
      );

      const balanceAfterUser = await balanceOfBase18(
        tokenContract,
        request.user,
      );

      request = await redemptionVault.requests(requestId);

      expect(request.exists).eq(false);
      expect(request.user).eq(ethers.constants.AddressZero);
      expect(request.tokenOut).eq(ethers.constants.AddressZero);
      expect(request.amountStUsdIn).eq('0');

      expect(balanceAfterStUsdUser).eq(balanceBeforeStUsdUser);

      if (!isManualFillToken) {
        expect(balanceAfterContract).eq(
          balanceBeforeContract.sub(expectedOutAmount),
        );
        expect(balanceAfterUser).eq(balanceBeforeUser.add(expectedOutAmount));
      } else {
        expect(balanceAfterContract).eq(balanceBeforeContract);
        expect(balanceAfterUser).eq(balanceBeforeUser);
      }
    },
  };
};
export const cancelRedemptionRequestTest = async (
  { redemptionVault, owner, stUSD }: CommonParamsDeposit,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(sender).cancelRedemptionRequest(requestId),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const requestBefore = await redemptionVault.requests(requestId);

  const balanceBeforeUser = await stUSD.balanceOf(requestBefore.user);

  const supplyBefore = await stUSD.totalSupply();

  await expect(
    redemptionVault.connect(sender).cancelRedemptionRequest(requestId),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['CancelRequest(uint256)'].name,
  ).to.not.reverted;

  const request = await redemptionVault.requests(requestId);

  const balanceAfterUser = await stUSD.balanceOf(requestBefore.user);

  const supplyAfter = await stUSD.totalSupply();

  expect(request.exists).eq(false);
  expect(request.user).eq(ethers.constants.AddressZero);
  expect(request.tokenOut).eq(ethers.constants.AddressZero);
  expect(request.fee).eq('0');
  expect(request.amountStUsdIn).eq('0');

  expect(supplyAfter).eq(
    supplyBefore.add(requestBefore.amountStUsdIn.add(requestBefore.fee)),
  );
  expect(balanceAfterUser).eq(
    balanceBeforeUser.add(requestBefore.amountStUsdIn.add(requestBefore.fee)),
  );
};

export const manualRedeemTest = (
  { redemptionVault, owner, stUSD }: CommonParamsDeposit,
  opt?: OptionalCommonParams,
) => {
  return {
    'manuallyRedeem(address,address,uint256)': async (
      user: Account,
      tokenOut: ERC20 | string,
      amountStUsdIn: number,
    ) => {
      const sender = opt?.from ?? owner;

      user = getAccount(user);
      tokenOut = getAccount(tokenOut);
      const amountIn = parseUnits(amountStUsdIn.toString());

      // eslint-disable-next-line camelcase
      const token = ERC20__factory.connect(tokenOut, owner);

      if (opt?.revertMessage) {
        await expect(
          redemptionVault
            .connect(sender)
            ['manuallyRedeem(address,address,uint256)'](
              user,
              tokenOut,
              amountIn,
            ),
        ).revertedWith(opt?.revertMessage);
        return;
      }

      const balanceBeforeStUsdUser = await stUSD.balanceOf(user);

      const balanceBeforeUser = await balanceOfBase18(token, user);

      const balanceBeforeContract = await balanceOfBase18(
        token,
        redemptionVault,
      );

      const supplyBefore = await stUSD.totalSupply();

      // eslint-disable-next-line camelcase
      const dataFeed = DataFeed__factory.connect(
        await redemptionVault.etfDataFeed(),
        owner,
      );

      // eslint-disable-next-line camelcase
      const aggregator = AggregatorV3Mock__factory.connect(
        await dataFeed.aggregator(),
        owner,
      );

      const amountOut = await getOutputAmountWithFeeRedeemTest(
        { redemptionVault, mockedAggregator: aggregator },
        {
          amountN: amountStUsdIn,
        },
      );

      await expect(
        redemptionVault
          .connect(sender)
          ['manuallyRedeem(address,address,uint256)'](user, tokenOut, amountIn),
      ).to.emit(
        redemptionVault,
        redemptionVault.interface.events[
          'PerformManualAction(address,address,address,uint256,uint256)'
        ].name,
      ).to.not.reverted;

      const balanceAfterStUsdUser = await stUSD.balanceOf(user);

      const balanceAfterUser = await balanceOfBase18(token, user);

      const balanceAfterContract = await balanceOfBase18(
        token,
        redemptionVault,
      );

      const supplyAfter = await stUSD.totalSupply();

      expect(supplyAfter).eq(supplyBefore.sub(amountIn));
      expect(balanceAfterStUsdUser).eq(balanceBeforeStUsdUser.sub(amountIn));

      expect(balanceAfterUser).eq(balanceBeforeUser.add(amountOut));
      expect(balanceAfterContract).eq(balanceBeforeContract.sub(amountOut));
    },
    'manuallyRedeem(address,address,uint256,uint256)': async (
      user: Account,
      tokenOut: ERC20 | string,
      amountStUsdIn: number,
      amountUsdOut: number,
    ) => {
      const sender = opt?.from ?? owner;

      user = getAccount(user);
      tokenOut = getAccount(tokenOut);
      const amountIn = parseUnits(amountStUsdIn.toString());
      const amountOut = parseUnits(amountUsdOut.toString());

      // eslint-disable-next-line camelcase
      const token = ERC20__factory.connect(tokenOut, owner);

      if (opt?.revertMessage) {
        await expect(
          redemptionVault
            .connect(sender)
            ['manuallyRedeem(address,address,uint256,uint256)'](
              user,
              tokenOut,
              amountIn,
              amountOut,
            ),
        ).revertedWith(opt?.revertMessage);
        return;
      }

      const balanceBeforeStUsdUser = await stUSD.balanceOf(user);

      const balanceBeforeUser = await balanceOfBase18(token, user);

      const balanceBeforeContract = await balanceOfBase18(
        token,
        redemptionVault,
      );

      const supplyBefore = await stUSD.totalSupply();

      await expect(
        redemptionVault
          .connect(sender)
          ['manuallyRedeem(address,address,uint256,uint256)'](
            user,
            tokenOut,
            amountIn,
            amountOut,
          ),
      ).to.emit(
        redemptionVault,
        redemptionVault.interface.events[
          'PerformManualAction(address,address,address,uint256,uint256)'
        ].name,
      ).to.not.reverted;

      const balanceAfterStUsdUser = await stUSD.balanceOf(user);

      const balanceAfterUser = await balanceOfBase18(token, user);

      const balanceAfterContract = await balanceOfBase18(
        token,
        redemptionVault,
      );

      const supplyAfter = await stUSD.totalSupply();

      expect(supplyAfter).eq(supplyBefore.sub(amountIn));
      expect(balanceAfterStUsdUser).eq(balanceBeforeStUsdUser.sub(amountIn));

      expect(balanceAfterUser).eq(balanceBeforeUser.add(amountOut));
      expect(balanceAfterContract).eq(balanceBeforeContract.sub(amountOut));
    },
  };
};

export const getOutputAmountWithFeeRedeemTest = async (
  { redemptionVault, mockedAggregator }: CommonParamsGetOutputAmount,
  {
    priceN,
    amountN,
    feeN,
  }: {
    amountN: number;
    priceN?: number;
    feeN?: number;
  },
) => {
  const bps = await redemptionVault.PERCENTAGE_BPS();

  priceN ??= await getRoundData({ mockedAggregator });
  feeN ??= (await redemptionVault.getFee()).toNumber() / bps.toNumber();

  const price = await setRoundData({ mockedAggregator }, priceN);
  const amount = parseUnits(amountN.toString());
  const fee = feeN * bps.toNumber();
  const woFee = price.eq(ethers.constants.Zero)
    ? ethers.constants.Zero
    : amount.mul(price).div(parseUnits('1'));

  const expectedValue = woFee.sub(woFee.mul(fee).div(bps.mul(100)));

  await redemptionVault.setFee(fee);

  const realValue = await redemptionVault.getOutputAmountWithFee(amount);

  expect(realValue).eq(expectedValue);

  return realValue;
};
