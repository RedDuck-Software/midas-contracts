import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

import { OptionalCommonParams } from './common.helpers';

import { Greenlistable } from '../../typechain-types';

type CommonParamsGreenList = {
  greenlistable: Greenlistable;
  owner: SignerWithAddress;
};

export const greenListEnable = async (
  { greenlistable, owner }: CommonParamsGreenList,
  enable: boolean,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      greenlistable.connect(opt?.from ?? owner).setGreenlistEnable(enable),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    greenlistable.connect(opt?.from ?? owner).setGreenlistEnable(enable),
  ).to.emit(
    greenlistable,
    greenlistable.interface.events['SetGreenlistEnable(address,bool)'].name,
  ).to.not.reverted;

  expect(await greenlistable.greenlistEnabled()).eq(enable);
};
