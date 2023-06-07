import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { StUSD__factory } from '../typechain-types';
import { parseUnits } from 'ethers/lib/utils';
import { DATA_FEED_DEPLOY_TAG, MIDAS_AC_DEPLOY_TAG, REDEMPTION_VAULT_CONTRACT_NAME, REDEMPTION_VAULT_DEPLOY_TAG, ST_USD_DEPLOY_TAG } from '../config';


const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const ac = await get(MIDAS_AC_DEPLOY_TAG);
  const stUsd = await get(ST_USD_DEPLOY_TAG);
  const dataFeed = await get(DATA_FEED_DEPLOY_TAG);

  await deploy(REDEMPTION_VAULT_CONTRACT_NAME, {
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
            '0'
          ]
        }
      }
    },
    log: true,
    autoMine: true,
  });
};

func.tags = [REDEMPTION_VAULT_DEPLOY_TAG];
func.dependencies = [
  MIDAS_AC_DEPLOY_TAG,
  ST_USD_DEPLOY_TAG,
  DATA_FEED_DEPLOY_TAG
]
func.id = REDEMPTION_VAULT_CONTRACT_NAME;

export default func;
