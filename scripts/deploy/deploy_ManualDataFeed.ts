import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  MANUAL_AGGREGATOR_CONTRACT_NAME,
  MANUAL_AGGREGATOR_CONTRACT_TAG,
} from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  logDeploy,
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

// eslint-disable-next-line camelcase

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const addresses = getCurrentAddresses(hre);

  console.log('Deploying DataFeed...');

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(MANUAL_AGGREGATOR_CONTRACT_NAME, owner),
    [addresses?.accessControl],
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
  await logDeployProxy(
    hre,
    MANUAL_AGGREGATOR_CONTRACT_NAME,
    deployment.address,
  );
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
