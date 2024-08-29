import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { constants } from 'ethers';
import { deployRedemptionVault, DeployRvConfig } from '../common/rv';

const configs: Record<number, DeployRvConfig> = {
  11155111: {
    type: 'SWAPPER',
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('0.1', 18),
    minFiatRedeemAmount: parseUnits('1', 18),
    requestRedeemer: undefined,
    liquidityProvider: undefined,
    mTbillRedemptionVault: undefined,
  },
  // 1: {
  //   type: 'SWAPPER',
  //   feeReceiver: '0x',
  //   tokensReceiver: '0x',
  //   instantDailyLimit: parseUnits('TODO'),
  //   instantFee: parseUnits('TODO', 2),
  //   minAmount: parseUnits('TODO'),
  //   variationTolerance: parseUnits('TODO', 2),
  //   fiatAdditionalFee: parseUnits('TODO', 2),
  //   fiatFlatFee: parseUnits('TODO', 18),
  //   minFiatRedeemAmount: parseUnits('TODO', 18),
  //   requestRedeemer: '0x',
  //   liquidityProvider: '0x',
  //   mTbillRedemptionVault: undefined,
  // },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mBASIS', networkConfig);
};

func(hre).then(console.log).catch(console.error);
