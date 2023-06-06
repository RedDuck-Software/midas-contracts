import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, Contract, Signer } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { ERC20, ERC20Mock, StUSD } from '../../typechain-types';

export type OptionalCommonParams = {
  from?: SignerWithAddress;
  revertMessage?: string;
};

export type Account = SignerWithAddress | string;
export type AccountOrContract = Account | Contract;

export const getAccount = (account: AccountOrContract) => {
  return (
    (account as SignerWithAddress).address ??
    (account as Contract).address ??
    (account as string)
  );
};

export const mintToken = async (
  token: ERC20Mock | StUSD,
  to: AccountOrContract,
  amountN: number,
) => {
  to = getAccount(to);
  const amount = await tokenAmountFromBase18(
    token,
    parseUnits(amountN.toString()),
  );
  await token.mint(to, amount);
};

export const approveBase18 = async (
  from: SignerWithAddress,
  token: ERC20,
  to: AccountOrContract,
  amountN: number,
) => {
  to = getAccount(to);
  const amount = await tokenAmountToBase18(
    token,
    parseUnits(amountN.toString()),
  );
  await expect(token.connect(from).approve(to, amount)).not.reverted;
};

export const amountToBase18 = async (
  decimals: BigNumberish,
  amount: BigNumberish,
) => {
  amount = BigNumber.from(amount);
  return amount.mul(parseUnits('1')).div(parseUnits('1', decimals));
};

export const amountFromBase18 = async (
  decimals: BigNumberish,
  amount: BigNumberish,
) => {
  amount = BigNumber.from(amount);
  return amount.mul(parseUnits('1', decimals)).div(parseUnits('1'));
};

export const tokenAmountToBase18 = async (
  token: ERC20,
  amount: BigNumberish,
) => {
  const decimals = await token.decimals();
  return amountToBase18(decimals, amount);
};

export const tokenAmountFromBase18 = async (
  token: ERC20,
  amount: BigNumberish,
) => {
  const decimals = await token.decimals();
  return amountFromBase18(decimals, amount);
};

export const balanceOfBase18 = async (token: ERC20, of: AccountOrContract) => {
  if (token.address === ethers.constants.AddressZero)
    return ethers.constants.Zero;
  of = getAccount(of);
  const balance = await token.balanceOf(of);
  return tokenAmountToBase18(token, balance);
};
