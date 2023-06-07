import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { MIDAS_AC_DEPLOY_TAG } from './deploy_MidasAccessControl';
import { StUSD__factory } from '../typechain-types';
import { ST_USD_DEPLOY_TAG } from './deploy_stUSD';
import { DATA_FEED_DEPLOY_TAG } from './deploy_DataFeed';
import { parseUnits } from 'ethers/lib/utils';

export const DEPOSIT_VAULT_DEPLOY_TAG = 'DepositVault';
export const DEPOSIT_VAULT_CONTRACT_NAME = 'DepositVault';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const ac = await get(MIDAS_AC_DEPLOY_TAG);
  const stUsd = await get(ST_USD_DEPLOY_TAG);
  const dataFeed = await get(DATA_FEED_DEPLOY_TAG);
  const config = {
    minUsdAmount: parseUnits('10')
  }

  await deploy(DEPOSIT_VAULT_CONTRACT_NAME, {
    from: deployer,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            ac.address,
            stUsd.address,
            dataFeed.address,
            config.minUsdAmount
          ]
        }
      }
    },
    log: true,
    autoMine: true,
  });
};

func.tags = [DEPOSIT_VAULT_DEPLOY_TAG];
func.dependencies = [
  MIDAS_AC_DEPLOY_TAG,
  ST_USD_DEPLOY_TAG,
  DATA_FEED_DEPLOY_TAG
]
func.id = DEPOSIT_VAULT_CONTRACT_NAME;

export default func;
