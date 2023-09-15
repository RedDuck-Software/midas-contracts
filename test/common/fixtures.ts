import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';

import { getAllRoles } from './common.helpers';
import { initGrantRoles, postDeploymentTest } from './post-deploy.helpers';

import {
  // eslint-disable-next-line camelcase
  AggregatorV3Mock__factory,
  // eslint-disable-next-line camelcase
  BlacklistableTester__factory,
  // eslint-disable-next-line camelcase
  DepositVaultTest__factory,
  // eslint-disable-next-line camelcase
  ERC20Mock__factory,
  // eslint-disable-next-line camelcase
  GreenlistableTester__factory,
  // eslint-disable-next-line camelcase
  MidasAccessControlTest__factory,
  // eslint-disable-next-line camelcase
  PausableTester__factory,
  // eslint-disable-next-line camelcase
  RedemptionVaultTest__factory,
  // eslint-disable-next-line camelcase
  StUSDTest__factory,
  // eslint-disable-next-line camelcase
  WithMidasAccessControlTester__factory,
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [owner, ...regularAccounts] = await ethers.getSigners();

  // main contracts
  const accessControl = await new MidasAccessControlTest__factory(
    owner,
  ).deploy();
  await accessControl.initialize();

  const stUSD = await new StUSDTest__factory(owner).deploy();
  await stUSD.initialize(accessControl.address);

  const mockedAggregator = await new AggregatorV3Mock__factory(owner).deploy();
  const mockedAggregatorDecimals = await mockedAggregator.decimals();

  const mockedAggregatorEur = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();
  const mockedAggregatorEurDecimals = await mockedAggregatorEur.decimals();

  await mockedAggregator.setRoundData(
    parseUnits('5', mockedAggregatorDecimals),
  );

  await mockedAggregatorEur.setRoundData(
    parseUnits('1.07778', mockedAggregatorEurDecimals),
  );

  const dataFeed = await new DataFeedTest__factory(owner).deploy();
  await dataFeed.initialize(accessControl.address, mockedAggregator.address);

  const eurToUsdDataFeed = await new DataFeedTest__factory(owner).deploy();
  await eurToUsdDataFeed.initialize(
    accessControl.address,
    mockedAggregatorEur.address,
  );

  const depositVault = await new DepositVaultTest__factory(owner).deploy();
  await depositVault.initialize(
    accessControl.address,
    stUSD.address,
    eurToUsdDataFeed.address,
    0,
  );

  const redemptionVault = await new RedemptionVaultTest__factory(
    owner,
  ).deploy();
  await redemptionVault.initialize(accessControl.address, stUSD.address);

  const stableCoins = {
    usdc: await new ERC20Mock__factory(owner).deploy(8),
    usdt: await new ERC20Mock__factory(owner).deploy(18),
    dai: await new ERC20Mock__factory(owner).deploy(9),
  };

  const manualFulfillmentToken =
    await redemptionVault.MANUAL_FULLFILMENT_TOKEN();

  // testers
  const wAccessControlTester = await new WithMidasAccessControlTester__factory(
    owner,
  ).deploy();
  await wAccessControlTester.initialize(accessControl.address);

  const blackListableTester = await new BlacklistableTester__factory(
    owner,
  ).deploy();
  await blackListableTester.initialize(accessControl.address);

  const greenListableTester = await new GreenlistableTester__factory(
    owner,
  ).deploy();
  await greenListableTester.initialize(accessControl.address);

  const pausableTester = await new PausableTester__factory(owner).deploy();
  await pausableTester.initialize(accessControl.address);

  const roles = await getAllRoles(accessControl);

  const offChainUsdToken = constants.AddressZero;

  // role granting main
  await initGrantRoles({
    accessControl,
    depositVault,
    owner,
    redemptionVault,
    stUsd: stUSD,
  });

  // role granting testers
  await accessControl.grantRole(
    roles.blacklistedOperator,
    blackListableTester.address,
  );
  await accessControl.grantRole(
    roles.greenlistedOperator,
    greenListableTester.address,
  );

  await postDeploymentTest(hre, {
    accessControl,
    aggregator: mockedAggregator,
    dataFeed,
    depositVault,
    owner,
    redemptionVault,
    aggregatorEur: mockedAggregatorEur,
    dataFeedEur: eurToUsdDataFeed,
    stUsd: stUSD,
  });

  return {
    stUSD,
    accessControl,
    wAccessControlTester,
    roles,
    owner,
    regularAccounts,
    blackListableTester,
    greenListableTester,
    pausableTester,
    dataFeed,
    mockedAggregator,
    mockedAggregatorDecimals,
    depositVault,
    redemptionVault,
    stableCoins,
    manualFulfillmentToken,
    eurToUsdDataFeed,
    mockedAggregatorEur,
    offChainUsdToken,
    mockedAggregatorEurDecimals,
  };
};
