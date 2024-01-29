import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import {
  defaultAbiCoder,
  parseUnits,
  solidityKeccak256,
} from 'ethers/lib/utils';

import {
  Account,
  AccountOrContract,
  OptionalCommonParams,
  getAccount,
} from './common.helpers';
import { defaultDeploy } from './fixtures';

type CommonParams = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'stUSDr' | 'mTBILL' | 'owner'
>;

export const mint = async (
  { mTBILL, stUSDr, owner }: CommonParams,
  to: AccountOrContract,
  amountShares: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      stUSDr.connect(opt?.from ?? owner).mint(getAccount(to), amountShares),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const minter = getAccount(opt?.from ?? owner);
  const price = await stUSDr.getUnderlyingTokenPrice();

  const balanceBefore = await stUSDr.balanceOf(minter);

  const expectedTokensMinted = BigNumber.from(amountShares)
    .mul(price)
    .div(parseUnits('1'));
  const expectedBalanceAfter = balanceBefore.add(expectedTokensMinted);

  const balanceMTBILLBefore = await mTBILL.balanceOf(minter);
  const balanceMTBILLBeforeContract = await mTBILL.balanceOf(stUSDr.address);
  const sharesBefore = await stUSDr.sharesOf(minter);
  const totalSharesBefore = await stUSDr.totalShares();
  const totalSupplyBefore = await stUSDr.totalSupply();

  await expect(
    stUSDr.connect(opt?.from ?? owner).mint(getAccount(to), amountShares),
  )
    .to.emit(
      stUSDr,
      stUSDr.interface.events['TransferShares(address,address,uint256)'].name,
    )
    .to.emit(
      stUSDr,
      stUSDr.interface.events['Transfer(address,address,uint256)'].name,
    ).to.not.reverted;

  const balanceAfter = await stUSDr.balanceOf(minter);
  const balanceMTBILLAfter = await mTBILL.balanceOf(minter);
  const balanceMTBILLAfterContract = await mTBILL.balanceOf(stUSDr.address);
  const sharesAfter = await stUSDr.sharesOf(minter);
  const totalSharesAfter = await stUSDr.totalShares();
  const totalSupplyAfter = await stUSDr.totalSupply();

  expect(balanceAfter).eq(expectedBalanceAfter);
  expect(balanceMTBILLAfter).eq(balanceMTBILLBefore.sub(amountShares));
  expect(balanceMTBILLAfterContract).eq(
    balanceMTBILLBeforeContract.add(amountShares),
  );
  expect(sharesAfter).eq(sharesBefore.add(amountShares));
  expect(totalSharesAfter).eq(totalSharesBefore.add(amountShares));
  expect(totalSupplyAfter).eq(totalSupplyBefore.add(expectedTokensMinted));
};

export const burn = async (
  { mTBILL, stUSDr, owner }: CommonParams,
  amountTokens: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      stUSDr.connect(opt?.from ?? owner).burn(amountTokens),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const minter = getAccount(opt?.from ?? owner);
  const price = await stUSDr.getUnderlyingTokenPrice();

  const balanceBefore = await stUSDr.balanceOf(minter);
  const sharesBefore = await stUSDr.sharesOf(minter);

  const expectedSharesBurned = BigNumber.from(amountTokens)
    .mul(parseUnits('1'))
    .div(price);

  const expectedSharesAfter = sharesBefore.sub(expectedSharesBurned);

  const balanceMTBILLBefore = await mTBILL.balanceOf(minter);
  const balanceMTBILLBeforeContract = await mTBILL.balanceOf(stUSDr.address);
  const totalSharesBefore = await stUSDr.totalShares();
  const totalSupplyBefore = await stUSDr.totalSupply();

  await expect(stUSDr.connect(opt?.from ?? owner).burn(amountTokens))
    .to.emit(
      stUSDr,
      stUSDr.interface.events['TransferShares(address,address,uint256)'].name,
    )
    .to.emit(
      stUSDr,
      stUSDr.interface.events['Transfer(address,address,uint256)'].name,
    ).to.not.reverted;

  const balanceAfter = await stUSDr.balanceOf(minter);
  const balanceMTBILLAfter = await mTBILL.balanceOf(minter);
  const balanceMTBILLAfterContract = await mTBILL.balanceOf(stUSDr.address);
  const sharesAfter = await stUSDr.sharesOf(minter);
  const totalSharesAfter = await stUSDr.totalShares();
  const totalSupplyAfter = await stUSDr.totalSupply();

  expect(balanceAfter).eq(balanceBefore.sub(amountTokens));
  expect(balanceMTBILLAfter).eq(balanceMTBILLBefore.add(expectedSharesBurned));
  expect(balanceMTBILLAfterContract).eq(
    balanceMTBILLBeforeContract.sub(expectedSharesBurned),
  );
  expect(sharesAfter).eq(expectedSharesAfter);
  expect(totalSharesAfter).eq(totalSharesBefore.sub(expectedSharesBurned));
  expect(totalSupplyAfter).eq(totalSupplyBefore.sub(amountTokens));
};
