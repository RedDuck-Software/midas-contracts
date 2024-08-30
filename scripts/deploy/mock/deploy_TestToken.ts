import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify } from '../../../helpers/utils';
import {
  AggregatorV3Mock__factory,
  ERC20MockWithName__factory,
} from '../../../typechain-types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying ERC20MockWithName...');

  const deployment = await new ERC20MockWithName__factory(owner).deploy(
    18,
    'BUIDL',
    'BUIDL',
  );

  console.log('Deployed ERC20MockWithName:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await etherscanVerify(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
