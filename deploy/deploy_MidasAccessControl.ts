import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { MIDAS_AC_CONTRACT_NAME, MIDAS_AC_DEPLOY_TAG } from '../config';


const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy(MIDAS_AC_CONTRACT_NAME, {
    from: deployer,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: []
        }
      }
    },
    log: true,
    autoMine: true,
  });
};

func.tags = [MIDAS_AC_DEPLOY_TAG];
func.id = MIDAS_AC_CONTRACT_NAME;

export default func;
