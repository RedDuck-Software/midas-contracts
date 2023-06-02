import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';

import {
  BlacklistableTester,
  BlacklistableTester__factory,
  GreenlistableTester,
  GreenlistableTester__factory,
  MidasAccessControl,
  MidasAccessControl__factory,
  StUSD__factory,
  WithMidasAccessControlTester,
  WithMidasAccessControlTester__factory,
} from '../../typechain-types';
import { StUSD } from '../../typechain-types/contracts/StUSD';

export const defaultDeploy = async () => {
  const [owner, ...regularAccounts] = await ethers.getSigners();

  const accessControl = (await upgrades.deployProxy(
    await ethers.getContractFactory('MidasAccessControl'),
    [],
  )) as MidasAccessControl;
  const stUSD = (await upgrades.deployProxy(
    await ethers.getContractFactory('stUSD'),
    [accessControl.address],
  )) as StUSD;

  // testers
  const wAccessControlTester = (await upgrades.deployProxy(
    await ethers.getContractFactory('WithMidasAccessControlTester'),
    [accessControl.address],
  )) as WithMidasAccessControlTester;
  const blackListableTester = (await upgrades.deployProxy(
    await ethers.getContractFactory('BlacklistableTester'),
    [accessControl.address],
  )) as BlacklistableTester;
  const greenListableTester = (await upgrades.deployProxy(
    await ethers.getContractFactory('GreenlistableTester'),
    [accessControl.address],
  )) as GreenlistableTester;

  const roles = {
    blacklisted: await accessControl.BLACKLISTED_ROLE(),
    greenlisted: await accessControl.GREENLISTED_ROLE(),
    minter: await accessControl.ST_USD_MINT_OPERATOR_ROLE(),
    burner: await accessControl.ST_USD_BURN_OPERATOR_ROLE(),
    pauser: await accessControl.ST_USD_PAUSE_OPERATOR_ROLE(),
    greenlistedOperator: await accessControl.GREENLIST_OPERATOR_ROLE(),
    blacklistedOperator: await accessControl.BLACKLIST_OPERATOR_ROLE(),
    defaultAdmin: await accessControl.DEFAULT_ADMIN_ROLE(),
  };

  await accessControl.grantRole(roles.blacklistedOperator, stUSD.address);
  await accessControl.grantRole(
    roles.blacklistedOperator,
    blackListableTester.address,
  );

  await accessControl.grantRole(
    roles.greenlistedOperator,
    greenListableTester.address,
  );

  return {
    stUSD,
    accessControl,
    wAccessControlTester,
    roles,
    owner,
    regularAccounts,
    blackListableTester,
    greenListableTester,
  };
};
