import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { Account, OptionalCommonParams, getAccount } from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  DepositVault,
  ERC20,
  // eslint-disable-next-line camelcase
  ERC20__factory,
  RedemptionVault,
} from '../../typechain-types';

type CommonParamsChangePaymentToken = {
  vault: DepositVault | RedemptionVault;
  owner: SignerWithAddress;
};
type CommonParams = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVault' | 'owner'
>;

export const setInstantFeeTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newFee: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setInitialFee(newFee),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setInitialFee(newFee))
    .to.emit(
      vault,
      vault.interface.events['SetInitialFee(address,uint256)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newFee).to.not.reverted;

  const fee = await vault.initialFee();
  expect(fee).eq(newFee);
};

export const setVariabilityToleranceTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newTolerance: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setVariationTolerance(newTolerance),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).setVariationTolerance(newTolerance),
  )
    .to.emit(
      vault,
      vault.interface.events['SetVariationTolerance(address,uint256)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newTolerance).to.not.reverted;

  const tolerance = await vault.variationTolerance();
  expect(tolerance).eq(newTolerance);
};

export const addWaivedFeeAccountTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account))
    .to.emit(
      vault,
      vault.interface.events['AddWaivedFeeAccount(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, account).to.not.reverted;

  const isWaivedFee = await vault.waivedFeeRestriction(account);
  expect(isWaivedFee).eq(true);
};

export const changeTokenAllowanceTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: string,
  newAllowance: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault
        .connect(opt?.from ?? owner)
        .changeTokenAllowance(token, newAllowance),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).changeTokenAllowance(token, newAllowance),
  )
    .to.emit(
      vault,
      vault.interface.events['ChangeTokenAllowance(address,uint256,address)']
        .name,
    )
    .withArgs((opt?.from ?? owner).address, token).to.not.reverted;

  const allowance = (await vault.tokensConfig(token)).allowance;
  expect(allowance).eq(newAllowance);
};

export const removeWaivedFeeAccountTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).removeWaivedFeeAccount(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).removeWaivedFeeAccount(account),
  )
    .to.emit(
      vault,
      vault.interface.events['RemoveWaivedFeeAccount(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, account).to.not.reverted;

  const isWaivedFee = await vault.waivedFeeRestriction(account);
  expect(isWaivedFee).eq(false);
};

export const setInstantLimitTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newLimit: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setInitialLimit(newLimit),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setInitialLimit(newLimit))
    .to.emit(
      vault,
      vault.interface.events['SetInitialLimit(address,uint256)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newLimit).to.not.reverted;

  const limit = await vault.initialLimit();
  expect(limit).eq(newLimit);
};

export const setFeeReceiverTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newReceiver: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setFeeReceiver(newReceiver),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setFeeReceiver(newReceiver))
    .to.emit(
      vault,
      vault.interface.events['SetFeeReceiver(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newReceiver).to.not.reverted;

  const feeReceiver = await vault.feeReceiver();
  expect(feeReceiver).eq(newReceiver);
};

export const addAccountWaivedFeeRestrictionTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account))
    .to.emit(
      vault,
      vault.interface.events['AddWaivedFeeAccount(address,address)'].name,
    )
    .withArgs(account, (opt?.from ?? owner).address).to.not.reverted;
};

export const setMinAmountToDepositTest = async (
  { depositVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      depositVault
        .connect(opt?.from ?? owner)
        .setMinAmountToFirstDeposit(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVault.connect(opt?.from ?? owner).setMinAmountToFirstDeposit(value),
  ).to.emit(
    depositVault,
    depositVault.interface.events['SetMinAmountToFirstDeposit(address,uint256)']
      .name,
  ).to.not.reverted;

  const newMin = await depositVault.minAmountToFirstDeposit();
  expect(newMin).eq(value);
};

export const setMinAmountTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setMinAmount(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setMinAmount(value)).to.emit(
    vault,
    vault.interface.events['SetMinAmount(address,uint256)'].name,
  ).to.not.reverted;

  const newMin = await vault.minAmount();
  expect(newMin).eq(value);
};

export const addPaymentTokenTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: ERC20 | string,
  dataFeed: string,
  fee: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  token = (token as ERC20).address ?? (token as string);

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).addPaymentToken(token, dataFeed, fee),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).addPaymentToken(token, dataFeed, fee),
  ).to.emit(
    vault,
    vault.interface.events['AddPaymentToken(address,address,uint256,address)']
      .name,
  ).to.not.reverted;

  const paymentTokens = await vault.getPaymentTokens();
  expect(paymentTokens.find((v) => v === token)).not.eq(undefined);
  const tokenConfig = await vault.tokensConfig(token);
  expect(tokenConfig.dataFeed).eq(dataFeed);
  expect(tokenConfig.fee).eq(fee);
};

export const removePaymentTokenTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: ERC20 | string,
  opt?: OptionalCommonParams,
) => {
  token = (token as ERC20).address ?? (token as string);

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).removePaymentToken(token),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).removePaymentToken(token),
  ).to.emit(
    vault,
    vault.interface.events['RemovePaymentToken(address,address)'].name,
  ).to.not.reverted;

  const paymentTokens = await vault.getPaymentTokens();
  expect(paymentTokens.find((v) => v === token)).eq(undefined);
};

export const withdrawTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: ERC20 | string,
  amount: BigNumberish,
  withdrawTo: Account,
  opt?: OptionalCommonParams,
) => {
  withdrawTo = getAccount(withdrawTo);
  token = getAccount(token);

  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(token, owner);

  if (opt?.revertMessage) {
    await expect(
      vault
        .connect(opt?.from ?? owner)
        .withdrawToken(token, amount, withdrawTo),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeContract = await tokenContract.balanceOf(vault.address);
  const balanceBeforeTo = await tokenContract.balanceOf(withdrawTo);

  await expect(
    vault.connect(opt?.from ?? owner).withdrawToken(token, amount, withdrawTo),
  ).to.emit(
    vault,
    vault.interface.events['WithdrawToken(address,address,address,uint256)']
      .name,
  ).to.not.reverted;

  const balanceAfterContract = await tokenContract.balanceOf(vault.address);
  const balanceAfterTo = await tokenContract.balanceOf(withdrawTo);

  expect(balanceAfterContract).eq(balanceBeforeContract.sub(amount));
  expect(balanceAfterTo).eq(balanceBeforeTo.add(amount));
};
