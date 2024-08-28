import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BASIS_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { deployDepositVault, DeployDvConfig } from '../common';
import { MBasisDepositVault } from '../../../typechain-types';
import { BigNumber, BigNumberish, constants } from 'ethers';

const configs: Record<number, DeployDvConfig> = {
  11155111: {
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('100'),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
  },
  // 1: {
  //   feeReceiver: '0x',
  //   tokensReceiver: '0x',
  //   instantDailyLimit: parseUnits('TODO'),
  //   instantFee: parseUnits('TODO', 2),
  //   minMTokenAmountForFirstDeposit: parseUnits('TODO'),
  //   minAmount: parseUnits('TODO'),
  //   variationTolerance: parseUnits('TODO', 2),
  // },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(
    hre,
    await hre.ethers.getContractFactory(M_BASIS_DEPOSIT_VAULT_CONTRACT_NAME),
    'mBASIS',
    networkConfig,
  );
};

func(hre).then(console.log).catch(console.error);
