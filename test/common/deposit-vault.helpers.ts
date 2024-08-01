import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
} from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
  DepositVaultTest,
  ERC20,
  // eslint-disable-next-line camelcase
  ERC20__factory,
} from '../../typechain-types';

type CommonParamsDeposit = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVault' | 'owner' | 'mTBILL' | 'mTokenToUsdDataFeed'
>;

export const depositInstantTest = async (
  {
    depositVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
  }: CommonParamsDeposit & { waivedFee?: boolean },
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const sender = opt?.from ?? owner;
  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(tokenIn, owner);

  const tokensReceiver = await depositVault.tokensReceiver();
  const feeReceiver = await depositVault.feeReceiver();

  const amountIn = parseUnits(amountUsdIn.toFixed(18).replace(/\.?0+$/, ''));

  if (opt?.revertMessage) {
    await expect(
      depositVault
        .connect(sender)
        .depositInstant(tokenIn, amountIn, constants.HashZero),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceBeforeContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceBeforeUser = await balanceOfBase18(
    tokenContract,
    sender.address,
  );
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, sender.address);

  const totalDepositedBefore = await depositVault.totalDeposited(
    sender.address,
  );

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { fee, mintAmount, amountInWithoutFee, actualAmountInUsd } =
    await calcExpectedMintAmount(
      sender,
      tokenIn,
      depositVault,
      mTokenRate,
      amountIn,
      true,
    );

  await expect(
    depositVault
      .connect(sender)
      .depositInstant(tokenIn, amountIn, constants.HashZero),
  )
    .to.emit(
      depositVault,
      depositVault.interface.events[
        'DepositInstant(address,address,uint256,uint256,uint256,uint256,bytes32)'
      ].name,
    )
    .withArgs(
      sender.address,
      tokenContract.address,
      actualAmountInUsd,
      amountUsdIn,
      fee,
      0,
      constants.HashZero,
    ).to.not.reverted;

  const totalDepositedAfter = await depositVault.totalDeposited(sender.address);

  const balanceAfterContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceAfterContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);
  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, sender.address);

  expect(balanceMtBillAfterUser.sub(balanceMtBillBeforeUser)).eq(mintAmount);
  expect(totalDepositedAfter).eq(totalDepositedBefore.add(actualAmountInUsd));
  expect(balanceAfterContract).eq(
    balanceBeforeContract.add(amountInWithoutFee),
  );
  expect(feeReceiverBalanceAfterContract).eq(
    feeReceiverBalanceBeforeContract.add(fee),
  );
  if (waivedFee) {
    expect(feeReceiverBalanceAfterContract).eq(
      feeReceiverBalanceBeforeContract,
    );
  }
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
};

export const depositRequestTest = async (
  {
    depositVault,
    owner,
    mTokenToUsdDataFeed,
    waivedFee,
  }: CommonParamsDeposit & { waivedFee?: boolean },
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const sender = opt?.from ?? owner;
  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(tokenIn, owner);

  const tokensReceiver = await depositVault.tokensReceiver();
  const feeReceiver = await depositVault.feeReceiver();

  const amountIn = parseUnits(amountUsdIn.toFixed(18).replace(/\.?0+$/, ''));

  if (opt?.revertMessage) {
    await expect(
      depositVault
        .connect(sender)
        .depositRequest(tokenIn, amountIn, constants.HashZero),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceBeforeContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceBeforeUser = await balanceOfBase18(
    tokenContract,
    sender.address,
  );

  const latestRequestIdBefore = await depositVault.lastRequestId();
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { fee, mintAmount, amountInWithoutFee, actualAmountInUsd } =
    await calcExpectedMintAmount(
      sender,
      tokenIn,
      depositVault,
      mTokenRate,
      amountIn,
      false,
    );

  await expect(
    depositVault
      .connect(sender)
      .depositRequest(tokenIn, amountIn, constants.HashZero),
  )
    .to.emit(
      depositVault,
      depositVault.interface.events[
        'DepositRequest(uint256,address,address,uint256,uint256,uint256,bytes32)'
      ].name,
    )
    .withArgs(
      latestRequestIdBefore.add(1),
      sender.address,
      tokenContract.address,
      actualAmountInUsd,
      fee,
      mintAmount,
      constants.HashZero,
    ).to.not.reverted;

  const latestRequestIdAfter = await depositVault.lastRequestId();
  const balanceAfterContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceAfterContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);
  const request = await depositVault.mintRequests(latestRequestIdAfter);

  expect(request.depositedUsdAmount).eq(actualAmountInUsd);
  expect(request.tokenOutRate).eq(mTokenRate);
  expect(request.sender).eq(sender.address);
  expect(request.status).eq(0);
  expect(request.tokenIn).eq(tokenContract.address);

  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  expect(balanceAfterContract).eq(
    balanceBeforeContract.add(amountInWithoutFee),
  );
  expect(feeReceiverBalanceAfterContract).eq(
    feeReceiverBalanceBeforeContract.add(fee),
  );
  if (waivedFee) {
    expect(feeReceiverBalanceAfterContract).eq(
      feeReceiverBalanceBeforeContract,
    );
  }
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
};

export const approveRequestTest = async (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  requestId: BigNumberish,
  newRate: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).approveRequest(requestId, newRate),
    ).revertedWith(opt?.revertMessage);
    return;
  }
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, sender.address);

  const totalDepositedBefore = await depositVault.totalDeposited(
    sender.address,
  );

  const requestData = await depositVault.mintRequests(requestId);

  const feePercent = await getFeePercent(
    requestData.sender,
    requestData.tokenIn,
    depositVault,
    false,
  );

  const expectedMintAmount = requestData.depositedUsdAmount
    .sub(requestData.depositedUsdAmount.mul(feePercent).div(10000))
    .mul(constants.WeiPerEther)
    .div(newRate);

  await expect(depositVault.connect(sender).approveRequest(requestId, newRate))
    .to.emit(
      depositVault,
      depositVault.interface.events['ApproveRequest(uint256,uint256)'].name,
    )
    .withArgs(requestId, newRate).to.not.reverted;

  const requestDataAfter = await depositVault.mintRequests(requestId);

  const totalDepositedAfter = await depositVault.totalDeposited(sender.address);

  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, sender.address);

  expect(balanceMtBillAfterUser.sub(balanceMtBillBeforeUser)).eq(
    expectedMintAmount,
  );
  expect(totalDepositedAfter).eq(
    totalDepositedBefore.add(requestData.depositedUsdAmount),
  );
  expect(requestDataAfter.sender).eq(requestData.sender);
  expect(requestDataAfter.tokenIn).eq(requestData.tokenIn);
  expect(requestDataAfter.tokenOutRate).eq(newRate);
  expect(requestDataAfter.depositedUsdAmount).eq(
    requestData.depositedUsdAmount,
  );
  expect(requestDataAfter.status).eq(1);
};

export const safeApproveRequestTest = async (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  requestId: BigNumberish,
  newRate: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).safeApproveRequest(requestId, newRate),
    ).revertedWith(opt?.revertMessage);
    return;
  }
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, sender.address);

  const totalDepositedBefore = await depositVault.totalDeposited(
    sender.address,
  );

  const requestData = await depositVault.mintRequests(requestId);

  const feePercent = await getFeePercent(
    requestData.sender,
    requestData.tokenIn,
    depositVault,
    false,
  );

  const expectedMintAmount = requestData.depositedUsdAmount
    .sub(requestData.depositedUsdAmount.mul(feePercent).div(10000))
    .mul(constants.WeiPerEther)
    .div(newRate);

  await expect(
    depositVault.connect(sender).safeApproveRequest(requestId, newRate),
  )
    .to.emit(
      depositVault,
      depositVault.interface.events['SafeApproveRequest(uint256,uint256)'].name,
    )
    .withArgs(requestId, newRate).to.not.reverted;

  const requestDataAfter = await depositVault.mintRequests(requestId);

  const totalDepositedAfter = await depositVault.totalDeposited(sender.address);

  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, sender.address);

  expect(balanceMtBillAfterUser.sub(balanceMtBillBeforeUser)).eq(
    expectedMintAmount,
  );
  expect(totalDepositedAfter).eq(
    totalDepositedBefore.add(requestData.depositedUsdAmount),
  );
  expect(requestDataAfter.sender).eq(requestData.sender);
  expect(requestDataAfter.tokenIn).eq(requestData.tokenIn);
  expect(requestDataAfter.tokenOutRate).eq(newRate);
  expect(requestDataAfter.depositedUsdAmount).eq(
    requestData.depositedUsdAmount,
  );
  expect(requestDataAfter.status).eq(1);
};

export const rejectRequestTest = async (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).rejectRequest(requestId),
    ).revertedWith(opt?.revertMessage);
    return;
  }
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, sender.address);

  const totalDepositedBefore = await depositVault.totalDeposited(
    sender.address,
  );

  const requestData = await depositVault.mintRequests(requestId);

  await expect(depositVault.connect(sender).rejectRequest(requestId))
    .to.emit(
      depositVault,
      depositVault.interface.events['RejectRequest(uint256,address)'].name,
    )
    .withArgs(requestId, requestData.sender).to.not.reverted;

  const requestDataAfter = await depositVault.mintRequests(requestId);

  const totalDepositedAfter = await depositVault.totalDeposited(sender.address);

  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, sender.address);

  expect(balanceMtBillAfterUser).eq(balanceMtBillBeforeUser);
  expect(totalDepositedAfter).eq(totalDepositedBefore);
  expect(requestDataAfter.sender).eq(requestData.sender);
  expect(requestDataAfter.tokenIn).eq(requestData.tokenIn);
  expect(requestDataAfter.tokenOutRate).eq(requestData.tokenOutRate);
  expect(requestDataAfter.depositedUsdAmount).eq(
    requestData.depositedUsdAmount,
  );
  expect(requestDataAfter.status).eq(2);
};

const getFeePercent = async (
  sender: string,
  token: string,
  depositVault: DepositVaultTest,
  isInstant: boolean,
) => {
  const tokenConfig = await depositVault.tokensConfig(token);
  let feePercent = constants.Zero;
  const isWaived = await depositVault.waivedFeeRestriction(sender);
  if (!isWaived) {
    feePercent = tokenConfig.fee;
    if (isInstant) {
      const instantFee = await depositVault.instantFee();
      feePercent = feePercent.add(instantFee);
    }
  }
  return feePercent;
};

const calcExpectedMintAmount = async (
  sender: SignerWithAddress,
  token: string,
  depositVault: DepositVaultTest,
  mTokenRate: BigNumber,
  amountIn: BigNumber,
  isInstant: boolean,
) => {
  const tokenConfig = await depositVault.tokensConfig(token);
  // eslint-disable-next-line camelcase
  const dataFeedContract = DataFeedTest__factory.connect(
    tokenConfig.dataFeed,
    sender,
  );
  const currentStableRate = await dataFeedContract.getDataInBase18();
  if (currentStableRate.isZero())
    return {
      mintAmount: constants.Zero,
      amountInWithoutFee: constants.Zero,
      actualAmountInUsd: constants.Zero,
      fee: constants.Zero,
    };

  const feePercent = await getFeePercent(
    sender.address,
    token,
    depositVault,
    isInstant,
  );

  const hundredPercent = await depositVault.ONE_HUNDRED_PERCENT();
  const fee = amountIn.mul(feePercent).div(hundredPercent);

  const amountInWithoutFee = amountIn.sub(fee);

  const feeInUsd = fee.mul(currentStableRate).div(constants.WeiPerEther);

  const actualAmountInUsd = amountIn
    .mul(currentStableRate)
    .div(constants.WeiPerEther);

  const usdForMintConvertion = actualAmountInUsd.sub(feeInUsd);

  return {
    mintAmount: usdForMintConvertion.mul(constants.WeiPerEther).div(mTokenRate),
    actualAmountInUsd,
    amountInWithoutFee,
    fee,
  };
};
