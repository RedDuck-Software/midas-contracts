import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getAllRoles } from './common.helpers';

import {
  AggregatorV3Interface,
  DataFeed,
  DepositVault,
  MidasAccessControl,
  RedemptionVault,
  mTBILL,
} from '../../typechain-types';

type Params = {
  accessControl: MidasAccessControl;
  mTBILL: mTBILL;
  dataFeed: DataFeed;
  dataFeedEur: DataFeed;
  aggregator: AggregatorV3Interface;
  depositVault: DepositVault;
  aggregatorEur: AggregatorV3Interface;
  redemptionVault: RedemptionVault;
  owner: SignerWithAddress;
  execute?: (role: string, address: string) => Promise<any>;
};

export const initGrantRoles = async ({
  accessControl,
  depositVault,
  redemptionVault,
  mTBILL,
  owner,
  execute,
}: Omit<
  Params,
  'aggregator' | 'dataFeed' | 'dataFeedEur' | 'aggregatorEur'
>) => {
  const roles = await getAllRoles(accessControl);

  const checkAndExecute = async (role: string, address: string) => {
    if (!(await accessControl.hasRole(role, address))) {
      if (execute) await execute(role, address);
      else {
        await accessControl
          .connect(owner)
          .grantRole(role, address)
          .then((tx) => tx.wait());
      }
    }
  };

  await checkAndExecute(roles.minter, depositVault.address);

  await checkAndExecute(roles.minter, redemptionVault.address);

  await checkAndExecute(roles.burner, redemptionVault.address);
};

export const postDeploymentTest = async (
  { ethers }: HardhatRuntimeEnvironment,
  {
    accessControl,
    aggregator,
    dataFeed,
    depositVault,
    redemptionVault,
    mTBILL,
    dataFeedEur,
    aggregatorEur,
    owner,
  }: Params,
) => {
  const roles = await getAllRoles(accessControl);

  /** mTBILL tests start */
  expect(await mTBILL.name()).eq('mTBILL');
  expect(await mTBILL.symbol()).eq('mTBILL');
  expect(await mTBILL.paused()).eq(false);

  /** mTBILL tests end */

  /** DataFeed tests start */

  // expect(await dataFeed.aggregator()).eq(aggregator.address);

  // expect(await dataFeedEur.aggregator()).eq(aggregatorEur.address);

  /** DataFeed tests end */

  /** DepositVault tests start */

  // expect(await depositVault.mTBILL()).eq(mTBILL.address);

  // expect(await depositVault.eurUsdDataFeed()).eq(dataFeedEur.address);

  // expect(await depositVault.ONE_HUNDRED_PERCENT()).eq('10000');

  // expect(await depositVault.minAmountToDepositInEuro()).eq('0');

  // expect(await depositVault.vaultRole()).eq(
  //   await accessControl.DEPOSIT_VAULT_ADMIN_ROLE(),
  // );

  // expect(await depositVault.MANUAL_FULLFILMENT_TOKEN()).eq(
  //   ethers.constants.AddressZero,
  // );

  /** DepositVault tests end */

  /** RedemptionVault tests start */

  // expect(await redemptionVault.mTBILL()).eq(mTBILL.address);

  // expect(await redemptionVault.ONE_HUNDRED_PERCENT()).eq('10000');

  // expect(await redemptionVault.lastRequestId()).eq('0');

  // expect(await redemptionVault.vaultRole()).eq(
  //   await accessControl.REDEMPTION_VAULT_ADMIN_ROLE(),
  // );

  // expect(await redemptionVault.MANUAL_FULLFILMENT_TOKEN()).eq(
  //   ethers.constants.AddressZero,
  // );

  /** RedemptionVault tests end */

  /** Owners roles tests start */

  const { blacklisted: _, greenlisted: __, ...rolesToCheck } = roles;

  for (const role of Object.values(rolesToCheck)) {
    expect(await accessControl.hasRole(role, owner.address)).to.eq(true);
  }

  expect(await accessControl.getRoleAdmin(roles.blacklisted)).eq(
    roles.blacklistedOperator,
  );

  /** Owners roles tests end */

  /** Contracts roles tests start */

  // expect(await accessControl.hasRole(roles.minter, depositVault.address)).eq(
  //   true,
  // );

  // expect(await accessControl.hasRole(roles.minter, redemptionVault.address)).eq(
  //   true,
  // );
  // expect(await accessControl.hasRole(roles.burner, redemptionVault.address)).eq(
  //   true,
  // );

  /** Contracts roles tests end */
};
