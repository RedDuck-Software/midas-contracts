import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_TBILL_CONTRACT_NAME } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Upgrading mTBILL at address:', addresses?.mTBILL);

  const impl = await (
    await hre.ethers.getContractFactory(M_TBILL_CONTRACT_NAME, owner)
  ).deploy();

  await impl.deployTransaction?.wait?.(3);

  console.log('Impl mTBILL:', impl.address);
};

func(hre).then(console.log).catch(console.error);
