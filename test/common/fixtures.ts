import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';

import {
  BlacklistableTester__factory,
  GreenlistableTester__factory,
  MidasAccessControl__factory,
  StUSD__factory,
  WithMidasAccessControlTester__factory,
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [owner, ...regularAccounts] = await ethers.getSigners();

  // main contracts
  const accessControl = await new MidasAccessControl__factory(owner).deploy();
  await accessControl.initialize();

  const stUSD = await new StUSD__factory(owner).deploy();
  await stUSD.initialize(accessControl.address);

  // testers
  const wAccessControlTester = await new WithMidasAccessControlTester__factory(
    owner,
  ).deploy();
  await wAccessControlTester.initialize(accessControl.address);

  const blackListableTester = await new BlacklistableTester__factory(
    owner,
  ).deploy();
  await blackListableTester.initialize(accessControl.address);

  const greenListableTester = await new GreenlistableTester__factory(
    owner,
  ).deploy();
  await greenListableTester.initialize(accessControl.address);

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

  // role granting main
  await accessControl.grantRole(roles.blacklistedOperator, stUSD.address);

  // role granting testers
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
