import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const MIDAS_AC_DEPLOY_TAG = 'MidasAccessControl';
export const MIDAS_AC_CONTRACT_NAME = 'MidasAccessControl';

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

  const res = await get(MIDAS_AC_CONTRACT_NAME);

  console.log({ address: res.address });
};

func.tags = [MIDAS_AC_DEPLOY_TAG];
func.id = MIDAS_AC_CONTRACT_NAME;

export default func;
