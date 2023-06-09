import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import chalk from 'chalk';
import { getCurrentAddresses } from '../../config/constants/addresses';
import * as hre from 'hardhat';
import { initGrantRoles } from '../../test/common/post-deploy.helpers';
import { DepositVault__factory, MidasAccessControl__factory, RedemptionVault__factory, StUSD__factory } from '../../typechain-types';


const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const addresses = getCurrentAddresses(hre);

  if(!addresses) return;

  await initGrantRoles({
    accessControl: MidasAccessControl__factory.connect(addresses.accessControl, owner),
    depositVault: DepositVault__factory.connect(addresses.depositVault, owner),
    redemptionVault: RedemptionVault__factory.connect(addresses.redemptionVault, owner),
    stUsd: StUSD__factory.connect(addresses.stUSD, owner),
    owner: owner
  })

  console.log(
    chalk.green('Roles granted')
  )
};

func(hre).then(console.log).catch(console.error);