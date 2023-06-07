import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { MIDAS_AC_DEPLOY_TAG } from './deploy_MidasAccessControl';
import { MOCK_AGGREGATOR_NETWORK_TAG } from '../config';
import { expect } from 'chai';
import { AggregatorV3Mock__factory } from '../typechain-types';
import { parseUnits } from 'ethers/lib/utils';
import chalk from 'chalk';

export const DATA_FEED_DEPLOY_TAG = 'DataFeed';
export const DATA_FEED_CONTRACT_NAME = 'DataFeed';

const aggregatorsByNetwork: Record<number, string> = {
  [1]: '',
  [11155111]: ''
}

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const ac = await get(MIDAS_AC_DEPLOY_TAG);

  let aggregator: string;

  if (hre.network.tags[MOCK_AGGREGATOR_NETWORK_TAG]) {
    console.log(
      chalk.bold.yellow('MOCK_AGGREGATOR_NETWORK_TAG is true, deploying mocked data aggregator')
    )
    const aggregatorDeploy = await deploy('AggregatorV3Mock', {
      from: deployer,
      log: true,
      autoMine: true,
    });

    const aggregatorContract = AggregatorV3Mock__factory.connect(aggregatorDeploy.address, owner)
    await aggregatorContract.setRoundData(parseUnits('5', await aggregatorContract.decimals()));

    aggregator = aggregatorContract.address;
  } else {
    console.log(
      chalk.bold.yellow('MOCK_AGGREGATOR_NETWORK_TAG is false, using production aggregator')
    )

    aggregator = aggregatorsByNetwork[hre.network.config.chainId ?? 1];
    expect(aggregator).not.eq(undefined);
  }


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
