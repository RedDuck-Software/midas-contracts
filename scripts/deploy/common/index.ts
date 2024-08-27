import { BigNumberish, constants, ContractFactory } from 'ethers';
import { DepositVault, MBasisDepositVault } from '../../../typechain-types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';

export type DeployDvConfig = {
  feeReceiver?: string;
  tokensReceiver?: string;
  instantDailyLimit: BigNumberish;
  instantFee: BigNumberish;
  sanctionsList?: string;
  variationTolerance: BigNumberish;
  minAmount: BigNumberish;
  minMTokenAmountForFirstDeposit: BigNumberish;
};

export const deployDepositVault = async (
  hre: HardhatRuntimeEnvironment,
  vaultFactory: ContractFactory,
  token: 'mTBILL' | 'mBASIS',
  networkConfig?: DeployDvConfig,
) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);
  const tokenAddresses = addresses?.[token];

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  console.log('Deploying DV...');

  const params = [
    addresses?.accessControl,
    {
      mToken: tokenAddresses?.token,
      mTokenDataFeed: tokenAddresses?.dataFeed,
    },
    {
      feeReceiver: networkConfig.feeReceiver ?? owner.address,
      tokensReceiver: networkConfig.tokensReceiver ?? owner.address,
    },
    {
      instantDailyLimit: networkConfig.instantDailyLimit,
      instantFee: networkConfig.instantFee,
    },
    networkConfig.sanctionsList ?? constants.AddressZero,
    networkConfig.variationTolerance,
    networkConfig.minAmount,
    networkConfig.minMTokenAmountForFirstDeposit,
  ] as
    | Parameters<MBasisDepositVault['initialize']>
    | Parameters<DepositVault['initialize']>;

  const deployment = await hre.upgrades.deployProxy(
    vaultFactory.connect(owner),
    params,
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log('Deployed DV:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, 'DV', deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};
