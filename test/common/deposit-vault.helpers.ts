import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
} from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  DataFeedTest,
  DepositVaultTest,
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
  'depositVault' | 'owner' | 'mTBILL' | 'dataFeed'
>;

type CommonParamsChangePaymentToken = {
  vault: DepositVaultTest;
  owner: SignerWithAddress;
};

export const setDepositFeeTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newFee: BigNumber,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(vault.connect(opt?.from ?? owner).setFee(newFee)).revertedWith(
      opt?.revertMessage,
    );
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setFee(newFee))
    .to.emit(vault, vault.interface.events['SetFee(address,uint256)'].name)
    .withArgs((opt?.from ?? owner).address, newFee).to.not.reverted;

  const fee = await vault.getFee();
  expect(fee).eq(newFee);
};

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

export const deposit = async (
  { depositVault, owner, mTBILL, dataFeed }: CommonParamsDeposit,
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const sender = opt?.from ?? owner;
  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(tokenIn, owner);

  const tokensReceiver = await depositVault.tokensReceiver();

  const amountIn = parseUnits(amountUsdIn.toFixed(18).replace(/\.?0+$/, ''));

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).deposit(tokenIn, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const balanceBeforeUser = await balanceOfBase18(
    tokenContract,
    sender.address,
  );
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, sender.address);

  const totalDepositedBefore = await depositVault.totalDeposited(
    sender.address,
  );

  const expectedMintAmount = await calcExpectedMintAmount(
    dataFeed,
    depositVault,
    amountIn,
  );

  await expect(depositVault.connect(sender).deposit(tokenIn, amountIn))
    .to.emit(
      depositVault,
      depositVault.interface.events['Deposit(address,address,uint256,uint256)']
        .name,
    )
    .withArgs(
      sender.address,
      tokenContract.address,
      amountUsdIn,
      expectedMintAmount,
    ).to.not.reverted;

  const totalDepositedAfter = await depositVault.totalDeposited(sender.address);

  const balanceAfterContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);
  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, sender.address);

  expect(balanceMtBillAfterUser.sub(balanceMtBillBeforeUser)).eq(
    expectedMintAmount,
  );
  expect(totalDepositedAfter).eq(totalDepositedBefore.add(amountIn));
  expect(balanceAfterContract).eq(balanceBeforeContract.add(amountIn));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
};

export const calcExpectedMintAmount = async (
  dataFeed: DataFeedTest,
  depositVault: DepositVaultTest,
  amountIn: BigNumber,
) => {
  const currentRate = await dataFeed.getDataInBase18();
  if (currentRate.isZero()) return constants.Zero;

  const outAmountActual = amountIn.mul(constants.WeiPerEther).div(currentRate);

  const feePercent = await depositVault.getFee();
  const hundredPercent = await depositVault.ONE_HUNDRED_PERCENT();

  const fee = outAmountActual.mul(feePercent).div(hundredPercent);

  return outAmountActual.sub(fee);
};
