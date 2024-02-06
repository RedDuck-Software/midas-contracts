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
  'miUSD' | 'mTBILL' | 'owner'
>;

export const mint = async (
  { mTBILL, miUSD, owner }: CommonParams,
  to: AccountOrContract,
  amountShares: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      miUSD.connect(opt?.from ?? owner).mint(getAccount(to), amountShares),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const minter = getAccount(opt?.from ?? owner);
  const price = await miUSD.getUnderlyingTokenPrice();

  const balanceBefore = await miUSD.balanceOf(minter);

  const expectedTokensMinted = BigNumber.from(amountShares)
    .mul(price)
    .div(parseUnits('1'));
  const expectedBalanceAfter = balanceBefore.add(expectedTokensMinted);

  const balanceMTBILLBefore = await mTBILL.balanceOf(minter);
  const balanceMTBILLBeforeContract = await mTBILL.balanceOf(miUSD.address);
  const sharesBefore = await miUSD.sharesOf(minter);
  const totalSharesBefore = await miUSD.totalShares();
  const totalSupplyBefore = await miUSD.totalSupply();

  await expect(
    miUSD.connect(opt?.from ?? owner).mint(getAccount(to), amountShares),
  )
    .to.emit(
      miUSD,
      miUSD.interface.events['TransferShares(address,address,uint256)'].name,
    )
    .to.emit(
      miUSD,
      miUSD.interface.events['Transfer(address,address,uint256)'].name,
    ).to.not.reverted;

  const balanceAfter = await miUSD.balanceOf(minter);
  const balanceMTBILLAfter = await mTBILL.balanceOf(minter);
  const balanceMTBILLAfterContract = await mTBILL.balanceOf(miUSD.address);
  const sharesAfter = await miUSD.sharesOf(minter);
  const totalSharesAfter = await miUSD.totalShares();
  const totalSupplyAfter = await miUSD.totalSupply();

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
  { mTBILL, miUSD, owner }: CommonParams,
  amountTokens: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      miUSD.connect(opt?.from ?? owner).burn(amountTokens),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const minter = getAccount(opt?.from ?? owner);
  const price = await miUSD.getUnderlyingTokenPrice();

  const balanceBefore = await miUSD.balanceOf(minter);
  const sharesBefore = await miUSD.sharesOf(minter);

  const expectedSharesBurned = BigNumber.from(amountTokens)
    .mul(parseUnits('1'))
    .div(price);

  const expectedSharesAfter = sharesBefore.sub(expectedSharesBurned);

  const balanceMTBILLBefore = await mTBILL.balanceOf(minter);
  const balanceMTBILLBeforeContract = await mTBILL.balanceOf(miUSD.address);
  const totalSharesBefore = await miUSD.totalShares();
  const totalSupplyBefore = await miUSD.totalSupply();

  await expect(miUSD.connect(opt?.from ?? owner).burn(amountTokens))
    .to.emit(
      miUSD,
      miUSD.interface.events['TransferShares(address,address,uint256)'].name,
    )
    .to.emit(
      miUSD,
      miUSD.interface.events['Transfer(address,address,uint256)'].name,
    ).to.not.reverted;

  const balanceAfter = await miUSD.balanceOf(minter);
  const balanceMTBILLAfter = await mTBILL.balanceOf(minter);
  const balanceMTBILLAfterContract = await mTBILL.balanceOf(miUSD.address);
  const sharesAfter = await miUSD.sharesOf(minter);
  const totalSharesAfter = await miUSD.totalShares();
  const totalSupplyAfter = await miUSD.totalSupply();

  expect(balanceAfter).eq(balanceBefore.sub(amountTokens));
  expect(balanceMTBILLAfter).eq(balanceMTBILLBefore.add(expectedSharesBurned));
  expect(balanceMTBILLAfterContract).eq(
    balanceMTBILLBeforeContract.sub(expectedSharesBurned),
  );
  expect(sharesAfter).eq(expectedSharesAfter);
  expect(totalSharesAfter).eq(totalSharesBefore.sub(expectedSharesBurned));
  expect(totalSupplyAfter).eq(totalSupplyBefore.sub(amountTokens));
};
