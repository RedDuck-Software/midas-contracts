import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { getAddress } from 'ethers/lib/utils';

import { Account, OptionalCommonParams, getAccount } from './common.helpers';

import {
  Blacklistable,
  Greenlistable,
  MidasAccessControl,
} from '../../typechain-types';

type CommonParamsBlackList = {
  blacklistable: Blacklistable;
  accessControl: MidasAccessControl;
  owner: SignerWithAddress;
};

type CommonParamsGreenList = {
  greenlistable: Greenlistable;
  accessControl: MidasAccessControl;
  owner: SignerWithAddress;
};

export const acRevertMessage = (address: string, role: string) => {
  return `AccessControl: account ${getAddress(
    address,
  )} is missing role ${role}`;
};

export const acErrors = {
  WMAC_HASNT_ROLE: 'WMAC: hasnt role',
  WMAC_HAS_ROLE: 'WMAC: has role',
};

export const blackList = async (
  { blacklistable, accessControl, owner }: CommonParamsBlackList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      blacklistable.connect(opt?.from ?? owner).addToBlackList(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(blacklistable.connect(owner).addToBlackList(account)).to.emit(
    accessControl,
    accessControl.interface.events['RoleGranted(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      await accessControl.BLACKLISTED_ROLE(),
      account,
    ),
  ).eq(true);
};

export const unBlackList = async (
  { blacklistable, accessControl, owner }: CommonParamsBlackList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      blacklistable.connect(opt?.from ?? owner).removeFromBlackList(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    blacklistable.connect(owner).removeFromBlackList(account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleRevoked(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      await accessControl.BLACKLISTED_ROLE(),
      account,
    ),
  ).eq(false);
};

export const greenList = async (
  { greenlistable, accessControl, owner }: CommonParamsGreenList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      greenlistable.connect(opt?.from ?? owner).addToGreenList(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(greenlistable.connect(owner).addToGreenList(account)).to.emit(
    accessControl,
    accessControl.interface.events['RoleGranted(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      await accessControl.GREENLISTED_ROLE(),
      account,
    ),
  ).eq(true);
};

export const unGreenList = async (
  { greenlistable, accessControl, owner }: CommonParamsGreenList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      greenlistable.connect(opt?.from ?? owner).removeFromGreenList(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    greenlistable.connect(owner).removeFromGreenList(account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleRevoked(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      await accessControl.GREENLISTED_ROLE(),
      account,
    ),
  ).eq(false);
};
