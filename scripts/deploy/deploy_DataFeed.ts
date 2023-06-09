import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import { upgrades } from 'hardhat';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  DATA_FEED_CONTRACT_NAME,
  DEPOSIT_VAULT_CONTRACT_NAME,
  MIDAS_AC_CONTRACT_NAME,
  MIDAS_AC_DEPLOY_TAG,
  MOCK_AGGREGATOR_NETWORK_TAG,
  ST_USD_CONTRACT_NAME,
} from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
  verify,
} from '../../helpers/utils';
import { AggregatorV3Mock__factory } from '../../typechain-types';

const aggregatorsByNetwork: Record<number, string> = {
  1: '',
  11155111: '',
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  let aggregator: string;

  if (hre.network.tags[MOCK_AGGREGATOR_NETWORK_TAG]) {
    console.log(
      chalk.bold.yellow(
        'MOCK_AGGREGATOR_NETWORK_TAG is true, deploying mocked data aggregator',
      ),
    );
    const aggregatorDeploy = await (
      await hre.ethers.getContractFactory('AggregatorV3Mock', owner)
    ).deploy();

    const aggregatorContract = AggregatorV3Mock__factory.connect(
      aggregatorDeploy.address,
      owner,
    );

    if ((await aggregatorContract.latestRoundData()).answer.eq('0')) {
      const newData = parseUnits(
        '5',
        await aggregatorContract.decimals(),
      ).toString();
      await aggregatorContract.setRoundData(newData);
    }

    aggregator = aggregatorContract.address;
  } else {
    console.log(
      chalk.bold.yellow(
        'MOCK_AGGREGATOR_NETWORK_TAG is false, using production aggregator',
      ),
    );

    aggregator = aggregatorsByNetwork[hre.network.config.chainId ?? 1];
    expect(aggregator).not.eq(undefined);
  }

  const addresses = getCurrentAddresses(hre);

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(DATA_FEED_CONTRACT_NAME, owner),
    [addresses?.accessControl, aggregator],
  );

  await logDeployProxy(hre, DEPOSIT_VAULT_CONTRACT_NAME, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
