import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AggregatorV3Interface__factory, DataFeed__factory, DepositVault__factory, MidasAccessControl__factory, RedemptionVault__factory, StUSD__factory } from '../typechain-types';
import { postDeploymentTest } from '../test/common/post-deploy.helpers';
import { DATA_FEED_DEPLOY_TAG, DEPOSIT_VAULT_DEPLOY_TAG, GRANT_ROLES_TAG, MIDAS_AC_DEPLOY_TAG, REDEMPTION_VAULT_DEPLOY_TAG, ST_USD_DEPLOY_TAG } from '../config';
import chalk from 'chalk';

export const POST_DEPLOY_TAG = 'POST_DEPLOY';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, get, execute } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const owner = await hre.ethers.getSigner(deployer);

  const accessControl = await get(MIDAS_AC_DEPLOY_TAG);
  const dataFeed = await get(DATA_FEED_DEPLOY_TAG);
  const depositVault = await get(DEPOSIT_VAULT_DEPLOY_TAG);
  const redemptionVault = await get(REDEMPTION_VAULT_DEPLOY_TAG);
  const stUsd = await get(ST_USD_DEPLOY_TAG);

  const dataFeedContract= DataFeed__factory.connect(dataFeed.address, owner);

  await postDeploymentTest(hre, {
    accessControl: MidasAccessControl__factory.connect(accessControl.address, owner),
    dataFeed: dataFeedContract,
    depositVault: DepositVault__factory.connect(depositVault.address, owner),
    redemptionVault: RedemptionVault__factory.connect(redemptionVault.address, owner),
    stUsd: StUSD__factory.connect(stUsd.address, owner),
    owner: owner,
    aggregator: AggregatorV3Interface__factory.connect(await dataFeedContract.aggregator(), owner)
  })

  console.log(
    chalk.green('Post deployment checks completed')
  )
};

func.tags = [POST_DEPLOY_TAG];
func.dependencies = [
  MIDAS_AC_DEPLOY_TAG,
  REDEMPTION_VAULT_DEPLOY_TAG,
  DEPOSIT_VAULT_DEPLOY_TAG,
  ST_USD_DEPLOY_TAG,
  DATA_FEED_DEPLOY_TAG,
  GRANT_ROLES_TAG
]
func.id = POST_DEPLOY_TAG;

export default func;
