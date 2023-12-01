import { expect } from 'chai';
import { BigNumberish, constants } from 'ethers';
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
  'depositVault' | 'owner'
>;

type CommonParamsDeposit = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVault' | 'owner' | 'mTBILL'
>;

type CommonParamsGetOutputAmount = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVault' | 'mockedAggregator'
>;

export const setMinAmountToDepositTest = async (
  { depositVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(opt?.from ?? owner).setMinAmountToDeposit(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVault.connect(opt?.from ?? owner).setMinAmountToDeposit(value),
  ).to.emit(
    depositVault,
    depositVault.interface.events['SetMinAmountToDeposit(address,uint256)']
      .name,
  ).to.not.reverted;

  const newMin = await depositVault.minAmountToDepositInEuro();
  expect(newMin).eq(value);
};

export const initiateDepositRequest = async (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const sender = opt?.from ?? owner;
  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(tokenIn, owner);
  const feePercentageInBPS = 15;

  const amountIn = parseUnits(amountUsdIn.toString());

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).initiateDepositRequest(tokenIn, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await depositVault.setFee(tokenIn, feePercentageInBPS);

  const balanceBeforeContract = await balanceOfBase18(
    tokenContract,
    depositVault.address,
  );
  const balanceBeforeUser = await balanceOfBase18(
    tokenContract,
    sender.address,
  );

  const totalDepositedBefore = await depositVault.totalDeposited(
    sender.address,
  );

  const fee = await depositVault.getFee(tokenIn);
  await expect(fee).eq(feePercentageInBPS);
  const feeAmount = amountIn.sub(amountIn.sub(fee.mul(amountIn).div(10000)));

  await expect(
    depositVault.connect(sender).initiateDepositRequest(tokenIn, amountIn),
  )
    .to.emit(
      depositVault,
      depositVault.interface.events[
        'InitiateRequest(uint256,address,address,uint256)'
      ].name,
    )
    .to.emit(
      depositVault,
      depositVault.interface.events['FeeCollected(uint256,address,uint256)']
        .name,
    )
    .withArgs(await depositVault.lastRequestId(), sender.address, feeAmount).to
    .not.reverted;

  const totalDepositedAfter = await depositVault.totalDeposited(sender.address);

  const balanceAfterContract = await balanceOfBase18(
    tokenContract,
    depositVault.address,
  );
  const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);

  expect(totalDepositedAfter).eq(
    totalDepositedBefore.add(amountIn.sub(feeAmount)),
  );

  if (tokenIn !== constants.AddressZero) {
    expect(balanceAfterContract).eq(balanceBeforeContract.add(amountIn));
    expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  }

  const lastRequestId = await depositVault.lastRequestId();

  const request = await depositVault.requests(lastRequestId);
  expect(request.user).eq(sender.address);
  expect(request.tokenIn).eq(tokenIn);
  expect(request.amountUsdIn).eq(amountIn.sub(feeAmount));
  expect(request.fee).eq(feeAmount);
};

export const fulfillDepositRequest = (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  opt?: OptionalCommonParams,
) => {
  return {
    'fulfillDepositRequest(uint256, uint256)': async (
      requestId: BigNumberish,
      amountStUsdOut: number,
    ) => {
      const sender = opt?.from ?? owner;
      const amountOut = parseUnits(amountStUsdOut.toString());

      if (opt?.revertMessage) {
        await expect(
          depositVault
            .connect(sender)
            .fulfillDepositRequest(requestId, amountOut),
        ).revertedWith(opt?.revertMessage);

        return;
      }

      let request = await depositVault.requests(requestId);
      expect(owner.address).eq(sender.address);
      expect(request.tokenIn).not.eq(ethers.constants.AddressZero);
      expect(request.fee).gt(0);
      expect(request.amountUsdIn).gt(0);

      const balanceStUsdBefore = await mTBILL.balanceOf(request.user);

      await expect(
        depositVault.fulfillDepositRequest(requestId, amountOut),
      ).to.emit(
        depositVault,
        depositVault.interface.events[
          'InitiateRequest(uint256,address,address,uint256)'
        ].name,
      ).to.not.reverted;

      const balanceStUsdAfter = await mTBILL.balanceOf(request.user);

      expect(balanceStUsdAfter).eq(balanceStUsdBefore.add(amountOut));

      request = await depositVault.requests(requestId);

      expect(request.user).eq(ethers.constants.AddressZero);
      expect(request.tokenIn).eq(ethers.constants.AddressZero);
      expect(request.amountUsdIn).eq(0);
      expect(request.fee).eq(0);
    },
  };
};

export const manualDepositTest = (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  opt?: OptionalCommonParams,
) => {
  return {
    'manuallyDeposit(address,address,uint256,uint256)': async (
      user: Account,
      tokenIn: ERC20 | string,
      amountUsdIn: number,
      amountStUsdOut: number,
    ) => {
      user = getAccount(user);

      const tokenStr = getAccount(tokenIn);
      // eslint-disable-next-line camelcase
      const token = ERC20__factory.connect(tokenStr, owner);

      const sender = opt?.from ?? owner;

      const amountIn = parseUnits(amountUsdIn.toString());
      const amountOut = parseUnits(amountStUsdOut.toString());

      if (opt?.revertMessage) {
        await expect(
          depositVault
            .connect(sender)
            .manuallyDeposit(user, tokenStr, amountIn, amountOut),
        ).revertedWith(opt?.revertMessage);

        return;
      }

      const balanceBeforeTokenUser = await balanceOfBase18(token, owner);
      const balanceBeforeStUsdUser = await mTBILL.balanceOf(user);

      const balanceBeforeContract = await balanceOfBase18(token, depositVault);

      const supplyBefore = await mTBILL.totalSupply();

      await expect(
        depositVault
          .connect(sender)
          .manuallyDeposit(user, token.address, amountIn, amountOut),
      ).to.emit(
        depositVault,
        depositVault.interface.events[
          'PerformManualAction(address,address,address,uint256,uint256)'
        ].name,
      ).to.not.reverted;

      const balanceAfterTokenUser = await balanceOfBase18(token, owner);
      const balanceAfterStUsdUser = await mTBILL.balanceOf(user);

      const balanceAfterContract = await balanceOfBase18(token, depositVault);

      const supplyAfter = await mTBILL.totalSupply();

      if (tokenStr !== constants.AddressZero) {
        expect(balanceAfterContract).eq(balanceBeforeContract);
        expect(balanceAfterTokenUser).eq(balanceBeforeTokenUser);
      }

      expect(supplyAfter).eq(supplyBefore.add(amountOut));
      expect(balanceAfterStUsdUser).eq(balanceBeforeStUsdUser.add(amountOut));
    },
  };
};

// export const feeCalculationTest = async (
//   { depositVault, mockedAggregator }: CommonParamsGetOutputAmount,
//   {
//     priceN,
//     amountN,
//     feeN,
//     token,
//   }: {
//     amountN: number;
//     priceN?: number;
//     feeN?: number;
//     token: string;
//   },
// ) => {
//   const percents_100 = await depositVault.ONE_HUNDRED_PERCENT();

//   priceN ??= await getRoundData({ mockedAggregator });

//   const price = await setRoundData({ mockedAggregator }, priceN);
//   const amount = parseUnits(amountN.toString());
//   const fee = (await depositVault.getFee(token)).toNumber();
//   const woFee = price.eq(ethers.constants.Zero)
//     ? ethers.constants.Zero
//     : amount.mul(parseUnits('1')).div(price);

//   const expectedValue = woFee.sub(woFee.mul(fee).div(percents_100));

//   await depositVault.setFee(token, fee);

//   const realValue = await depositVault.getOutputAmountWithFee(amount, token);

//   expect(realValue).eq(expectedValue);

//   return realValue;
// };

export const cancelDepositRequest = async (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).cancelDepositRequest(requestId),
    ).revertedWith(opt?.revertMessage);

    return;
  }

  const requestBefore = await depositVault.requests(requestId);
  // eslint-disable-next-line camelcase
  const token = ERC20__factory.connect(requestBefore.tokenIn, owner);

  await expect(
    depositVault.connect(sender).cancelDepositRequest(requestId),
  ).to.emit(
    depositVault,
    depositVault.interface.events['CancelRequest(uint256)'].name,
  ).to.not.reverted;

  const request = await depositVault.requests(requestId);

  const balanceAfterUser = await token.balanceOf(requestBefore.user);

  expect(request.user).eq(ethers.constants.AddressZero);
  expect(request.tokenIn).eq(ethers.constants.AddressZero);
  expect(request.amountUsdIn).eq('0');

  expect(balanceAfterUser).eq(requestBefore.amountUsdIn.add(requestBefore.fee));
};
