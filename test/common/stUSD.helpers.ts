import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { defaultAbiCoder, solidityKeccak256 } from 'ethers/lib/utils';

import { Account, OptionalCommonParams, getAccount } from './common.helpers';
import { defaultDeploy } from './fixtures';

type CommonParams = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'stUSD' | 'owner'
>;

export const setMetadataTest = async (
  { stUSD, owner }: CommonParams,
  key: string,
  value: string,
  opt?: OptionalCommonParams,
) => {
  const keyBytes32 = solidityKeccak256(['string'], [key]);
  const valueBytes = defaultAbiCoder.encode(['string'], [value]);

  if (opt?.revertMessage) {
    await expect(
      stUSD.connect(opt?.from ?? owner).setMetadata(keyBytes32, valueBytes),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    stUSD.connect(opt?.from ?? owner).setMetadata(keyBytes32, valueBytes),
  ).not.reverted;

  expect(await stUSD.metadata(keyBytes32)).eq(valueBytes);
};

export const mint = async (
  { stUSD, owner }: CommonParams,
  to: Account,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  to = getAccount(to);

  if (opt?.revertMessage) {
    await expect(
      stUSD.connect(opt?.from ?? owner).mint(to, amount),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBefore = await stUSD.balanceOf(to);

  await expect(stUSD.connect(owner).mint(to, amount)).to.emit(
    stUSD,
    stUSD.interface.events['Transfer(address,address,uint256)'].name,
  ).to.not.reverted;

  const balanceAfter = await stUSD.balanceOf(to);

  expect(balanceAfter.sub(balanceBefore)).eq(amount);
};

export const burn = async (
  { stUSD, owner }: CommonParams,
  from: Account,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  from = getAccount(from);

  if (opt?.revertMessage) {
    await expect(
      stUSD.connect(opt?.from ?? owner).burn(from, amount),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBefore = await stUSD.balanceOf(from);

  await expect(stUSD.connect(owner).burn(from, amount)).to.emit(
    stUSD,
    stUSD.interface.events['Transfer(address,address,uint256)'].name,
  ).to.not.reverted;

  const balanceAfter = await stUSD.balanceOf(from);

  expect(balanceBefore.sub(balanceAfter)).eq(amount);
};
