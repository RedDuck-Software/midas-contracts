import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { StUSD__factory } from '../typechain-types';
import { MIDAS_AC_DEPLOY_TAG, ST_USD_CONTRACT_NAME, ST_USD_DEPLOY_TAG } from '../config';


const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const ac = await get(MIDAS_AC_DEPLOY_TAG);

  await deploy(ST_USD_CONTRACT_NAME, {
    from: deployer,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            ac.address
          ]
        }
      }
    },
    log: true,
    autoMine: true,
  });
};

func.tags = [ST_USD_DEPLOY_TAG];
func.dependencies = [
  MIDAS_AC_DEPLOY_TAG
]
func.id = ST_USD_CONTRACT_NAME;

export default func;
