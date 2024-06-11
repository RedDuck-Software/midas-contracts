import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { defaultAbiCoder, solidityKeccak256 } from 'ethers/lib/utils';

import { Account, OptionalCommonParams, getAccount } from './common.helpers';
import { defaultDeploy } from './fixtures';
import { MBASISTest, MTBILL, MTBILLTest } from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

type CommonParams = {
  mTBILL?: MTBILL;
  mBASIS?: MTBILL;
  owner: SignerWithAddress;
};

export const setMetadataTest = async (
  { mTBILL, mBASIS, owner }: CommonParams,
  key: string,
  value: string,
  opt?: OptionalCommonParams,
) => {
  mTBILL ??= mBASIS!;

  const keyBytes32 = solidityKeccak256(['string'], [key]);
  const valueBytes = defaultAbiCoder.encode(['string'], [value]);

  if (opt?.revertMessage) {
    await expect(
      mTBILL.connect(opt?.from ?? owner).setMetadata(keyBytes32, valueBytes),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    mTBILL.connect(opt?.from ?? owner).setMetadata(keyBytes32, valueBytes),
  ).not.reverted;

  expect(await mTBILL.metadata(keyBytes32)).eq(valueBytes);
};

export const mint = async (
  { mTBILL, mBASIS, owner }: CommonParams,
  to: Account,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  mTBILL ??= mBASIS!;

  to = getAccount(to);

  if (opt?.revertMessage) {
    await expect(
      mTBILL.connect(opt?.from ?? owner).mint(to, amount),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBefore = await mTBILL.balanceOf(to);

  await expect(mTBILL.connect(owner).mint(to, amount)).to.emit(
    mTBILL,
    mTBILL.interface.events['Transfer(address,address,uint256)'].name,
  ).to.not.reverted;

  const balanceAfter = await mTBILL.balanceOf(to);

  expect(balanceAfter.sub(balanceBefore)).eq(amount);
};

export const burn = async (
  { mTBILL, mBASIS, owner }: CommonParams,
  from: Account,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  mTBILL ??= mBASIS!;

  from = getAccount(from);

  if (opt?.revertMessage) {
    await expect(
      mTBILL.connect(opt?.from ?? owner).burn(from, amount),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBefore = await mTBILL.balanceOf(from);

  await expect(mTBILL.connect(owner).burn(from, amount)).to.emit(
    mTBILL,
    mTBILL.interface.events['Transfer(address,address,uint256)'].name,
  ).to.not.reverted;

  const balanceAfter = await mTBILL.balanceOf(from);

  expect(balanceBefore.sub(balanceAfter)).eq(amount);
};
