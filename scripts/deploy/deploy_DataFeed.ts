import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DATA_FEED_CONTRACT_NAME } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  logDeploy,
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';
// eslint-disable-next-line camelcase
import { AggregatorV3Mock__factory } from '../../typechain-types';

// 0x0e0eb6cdad90174f1Db606EC186ddD0B5eD80847

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const addresses = getCurrentAddresses(hre);

  console.log('Deploying DataFeed...');

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(DATA_FEED_CONTRACT_NAME, owner),
    [
      addresses?.accessControl,
      '0x7811C1Bf5db28630F303267Cc613797EB9A81188',
      2592000,
      parseUnits('0.97', 8),
      parseUnits('1.04', 8),
    ],
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log('Deployed DataFeed:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, DATA_FEED_CONTRACT_NAME, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
