import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, Signer } from 'ethers';
import {
  defaultAbiCoder,
  formatUnits,
  parseUnits,
  solidityKeccak256,
} from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  Account,
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
  tokenAmountToBase18,
} from './common.helpers';
import { getRoundData, setRoundData } from './data-feed.helpers';
import { defaultDeploy } from './fixtures';

import {
  AggregatorV3Mock__factory,
  DataFeed__factory,
  DepositVault,
  ERC20,
  ERC20__factory,
  ManageableVault,
  RedemptionVault,
} from '../../typechain-types';

type CommonParams = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVault' | 'owner'
>;

type CommonParamsDeposit = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVault' | 'owner' | 'stUSD'
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

  const newMin = await depositVault.minUsdAmountToDeposit();
  expect(newMin).eq(value);
};

export const depositTest = async (
  { depositVault, owner, stUSD }: CommonParamsDeposit,
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const sender = opt?.from ?? owner;
  const tokenContract = ERC20__factory.connect(tokenIn, owner);

  const amountIn = parseUnits(amountUsdIn.toString());

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).deposit(tokenIn, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeContract = await balanceOfBase18(
    tokenContract,
    depositVault.address,
  );
  const balanceBeforeUser = await balanceOfBase18(
    tokenContract,
    sender.address,
  );
  const balanceStUsdBeforeUser = await stUSD.balanceOf(sender.address);

  const dataFeed = DataFeed__factory.connect(
    await depositVault.etfDataFeed(),
    owner,
  );
  const aggregator = AggregatorV3Mock__factory.connect(
    await dataFeed.aggregator(),
    owner,
  );

  const expectedOutAmount = await getOutputAmountWithFeeTest(
    { depositVault, mockedAggregator: aggregator },
    {
      amountN: amountUsdIn,
    },
  );

  await expect(depositVault.connect(sender).deposit(tokenIn, amountIn)).to.emit(
    depositVault,
    depositVault.interface.events[
      'Deposit(address,address,bool,uint256,uint256)'
    ].name,
  ).to.not.reverted;

  const balanceAfterContract = await balanceOfBase18(
    tokenContract,
    depositVault.address,
  );
  const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);
  const balanceStUsdAfterUser = await stUSD.balanceOf(sender.address);

  expect(balanceAfterContract).eq(balanceBeforeContract.add(amountIn));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceStUsdAfterUser).eq(
    balanceStUsdBeforeUser.add(expectedOutAmount),
  );
};

export const fulfillManualDepositTest = async (
  { depositVault, owner, stUSD }: CommonParamsDeposit,
  user: Account,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  user = getAccount(user);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountUsdIn.toString());

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).fulfillManualDeposit(user, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceStUsdBeforeUser = await stUSD.balanceOf(user);

  const dataFeed = DataFeed__factory.connect(
    await depositVault.etfDataFeed(),
    owner,
  );
  const aggregator = AggregatorV3Mock__factory.connect(
    await dataFeed.aggregator(),
    owner,
  );

  const expectedOutAmount = await getOutputAmountWithFeeTest(
    { depositVault, mockedAggregator: aggregator },
    {
      amountN: amountUsdIn,
    },
  );

  await expect(
    depositVault.connect(sender).fulfillManualDeposit(user, amountIn),
  ).to.emit(
    depositVault,
    depositVault.interface.events[
      'Deposit(address,address,bool,uint256,uint256)'
    ].name,
  ).to.not.reverted;

  const balanceStUsdAfterUser = await stUSD.balanceOf(user);

  expect(balanceStUsdAfterUser).eq(
    balanceStUsdBeforeUser.add(expectedOutAmount),
  );
};

export const getOutputAmountWithFeeTest = async (
  { depositVault, mockedAggregator }: CommonParamsGetOutputAmount,
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
  const bps = await depositVault.PERCENTAGE_BPS();

  priceN ??= await getRoundData({ mockedAggregator });
  feeN ??= (await depositVault.getFee()).toNumber() / bps.toNumber();

  const price = await setRoundData({ mockedAggregator }, priceN);
  const amount = parseUnits(amountN.toString());
  const fee = feeN * bps.toNumber();
  const woFee = price.eq(ethers.constants.Zero)
    ? ethers.constants.Zero
    : amount.mul(parseUnits('1')).div(price);

  const expectedValue = woFee.sub(woFee.mul(fee).div(bps.mul(100)));

  await depositVault.setFee(fee);

  const realValue = await depositVault.getOutputAmountWithFee(amount);

  expect(realValue).eq(expectedValue);

  return realValue;
};
