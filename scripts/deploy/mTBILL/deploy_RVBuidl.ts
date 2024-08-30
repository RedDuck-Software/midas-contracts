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
import { deployRedemptionVault, DeployRvConfig } from '../common/rv';

const configs: Record<number, DeployRvConfig> = {
  11155111: {
    type: 'BUIDL',
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
    buidlRedemption: '0x4cb1479705EA6F0dD63415111aF56eaCfBa019bb', // mocked BUIDL redemption 
  },
  // 1: {
  //   type: 'BUIDL',
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
  //   buidlRedemption: '0x',
  // },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mTBILL', networkConfig);
};

func(hre).then(console.log).catch(console.error);
