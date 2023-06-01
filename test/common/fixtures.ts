import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    MidasAccessControl__factory,
    StUSD__factory,
    WithMidasAccessControlTester__factory
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [owner, ...regularAccounts] = await ethers.getSigners();

  const accessControl = await new MidasAccessControl__factory(owner).deploy();
  const stUSD = await new StUSD__factory(owner).deploy(accessControl.address);
  const wAccessControlTester = await new WithMidasAccessControlTester__factory(owner).deploy(accessControl.address);

  const roles = {
    blacklisted: await accessControl.BLACKLISTED_ROLE(),
    whitelisted: await accessControl.WHITELISTED_ROLE(),
    minter: await accessControl.ST_USD_MINT_OPERATOR_ROLE(),
    burner: await accessControl.ST_USD_BURN_OPERATOR_ROLE(),
    pauser: await accessControl.ST_USD_PAUSE_OPERATOR_ROLE(),
    whitelistedOperator: await accessControl.WHITELIST_OPERATOR_ROLE(),
    blacklistedOperator: await accessControl.BLACKLIST_OPERATOR_ROLE(),
    defaultAdmin: await accessControl.DEFAULT_ADMIN_ROLE(),
  }
  
  await accessControl.grantRole(roles.blacklistedOperator, stUSD.address);
  
  return {
    stUSD,
    accessControl,
    wAccessControlTester,
    roles,
    owner,
    regularAccounts
  }
}