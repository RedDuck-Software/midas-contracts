import chalk from 'chalk';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { postDeploymentTest } from '../../test/common/post-deploy.helpers';
import {
  AggregatorV3Interface__factory,
  DataFeed__factory,
  DepositVault__factory,
  MidasAccessControl__factory,
  RedemptionVault__factory,
  StUSD__factory,
} from '../../typechain-types';

export const POST_DEPLOY_TAG = 'POST_DEPLOY';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const addresses = getCurrentAddresses(hre);

  if (!addresses) return;

  const dataFeedContract = DataFeed__factory.connect(
    addresses.etfDataFeed,
    owner,
  );
  const dataFeedEurContract = DataFeed__factory.connect(
    addresses.eurToUsdFeed,
    owner,
  );

  await postDeploymentTest(hre, {
    accessControl: MidasAccessControl__factory.connect(
      addresses.accessControl,
      owner,
    ),
    depositVault: DepositVault__factory.connect(addresses.depositVault, owner),
    redemptionVault: RedemptionVault__factory.connect(
      addresses.redemptionVault,
      owner,
    ),
    stUsd: StUSD__factory.connect(addresses.stUSD, owner),
    aggregator: AggregatorV3Interface__factory.connect(
      await dataFeedContract.aggregator(),
      owner,
    ),
    dataFeed: dataFeedContract,
    dataFeedEur: dataFeedEurContract,
    aggregatorEur: AggregatorV3Interface__factory.connect(
      await dataFeedEurContract.aggregator(),
      owner,
    ),
    owner,
  });

  console.log(chalk.green('Post deployment checks completed'));
};

func(hre).then(console.log).catch(console.error);
