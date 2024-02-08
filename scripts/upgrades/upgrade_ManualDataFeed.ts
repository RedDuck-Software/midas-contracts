import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  MANUAL_AGGREGATOR_CONTRACT_NAME,
  MIDAS_AC_CONTRACT_NAME,
} from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Upgrading ManualAggregator');
  const deployment = await hre.upgrades.upgradeProxy(
    '0x6d62d3c3c8f9912890788b50299bf4d2c64823b6',
    await hre.ethers.getContractFactory(MANUAL_AGGREGATOR_CONTRACT_NAME, owner),
    {
      unsafeAllow: ['constructor'],
    },
  );
  console.log('Upgraded ManualAggregator:', deployment.address);

  console.log('grant role');

  const ac = await hre.ethers.getContractAt(
    MIDAS_AC_CONTRACT_NAME,
    addresses?.accessControl ?? '',
    deployer,
  );

  const tx = await ac.grantRole(
    await deployment.MANUAL_AGGREGATOR_KEEPER(),
    '0x5Dfa1A1A58e3dCaEF8B610e55181eBcDd4495718',
  );

  console.log('role granted', tx.hash);

  await logDeployProxy(
    hre,
    MANUAL_AGGREGATOR_CONTRACT_NAME,
    deployment.address,
  );
  console.log('Waiting 5 blocks to verify...');
  if (deployment.deployTransaction) {
    await deployment.deployTransaction.wait(5);
  }
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
