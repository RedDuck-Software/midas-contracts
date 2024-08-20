import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MIDAS_AC_CONTRACT_NAME } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Upgrading AC at address:', addresses?.accessControl);
  const deployment = await hre.upgrades.upgradeProxy(
    addresses?.accessControl ?? '',
    await hre.ethers.getContractFactory(MIDAS_AC_CONTRACT_NAME, owner),
    {
      unsafeAllow: ['constructor'],
    },
  );
  console.log('Upgraded AC:', deployment.address);
};

func(hre).then(console.log).catch(console.error);
