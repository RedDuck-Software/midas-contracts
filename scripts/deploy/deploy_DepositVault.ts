import { upgrades } from 'hardhat';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  DEPOSIT_VAULT_CONTRACT_NAME,
  MIDAS_AC_CONTRACT_NAME,
  MIDAS_AC_DEPLOY_TAG,
  ST_USD_CONTRACT_NAME,
} from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  delay,
  logDeployProxy,
  tryEtherscanVerifyImplementation,
  verify,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const addresses = getCurrentAddresses(hre);

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(DEPOSIT_VAULT_CONTRACT_NAME, owner),
    [
      addresses?.accessControl,
      addresses?.stUSD,
      addresses?.etfDataFeed,
      addresses?.eurToUsdFeed,
      '0',
    ],
  );

  await delay(5_000);
  await logDeployProxy(hre, DEPOSIT_VAULT_CONTRACT_NAME, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
