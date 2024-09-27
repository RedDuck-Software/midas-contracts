import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  etherscanVerify,
} from '../../../helpers/utils';
import { AggregatorV3Mock__factory, RedemptionTest__factory } from '../../../typechain-types';
import { getCurrentAddresses } from '../../../config/constants/addresses';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);
  const addresses = getCurrentAddresses(hre);

  console.log('Deploying BuidlRedemptionMock...');

  const deployment = await new RedemptionTest__factory(owner).deploy(
    '0xE6e05cf306d41585BEE8Ae48F9f2DD7E0955e6D3', // test BUIDL token on sepolia
    addresses?.dataFeeds?.['usdc']?.token!,
  );

  console.log('Deployed BuidlRedemptionMock :', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await etherscanVerify(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
