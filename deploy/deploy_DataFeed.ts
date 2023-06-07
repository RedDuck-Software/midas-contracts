import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { MIDAS_AC_DEPLOY_TAG } from './deploy_MidasAccessControl';

export const DATA_FEED_DEPLOY_TAG = 'DataFeed';
export const DATA_FEED_CONTRACT_NAME = 'DataFeed';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const ac = await get(MIDAS_AC_DEPLOY_TAG);

  const aggregator = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'

  await deploy(DATA_FEED_CONTRACT_NAME, {
    from: deployer,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            ac.address,
            aggregator
          ]
        }
      }
    },
    log: true,
    autoMine: true,
  });
};

func.tags = [DATA_FEED_DEPLOY_TAG];
func.dependencies = [
  MIDAS_AC_DEPLOY_TAG,
]
func.id = DATA_FEED_CONTRACT_NAME;

export default func;
