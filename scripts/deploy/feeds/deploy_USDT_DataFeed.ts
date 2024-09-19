import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BASIS_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { deployDepositVault, DeployDvConfig } from '../common';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { DeployDataFeedConfig, deployTokenDataFeed } from '../common/data-feed';

const configs: Record<number, DeployDataFeedConfig> = {
    1: {
        healthyDiff: 24 * 60 * 60,
        minPrice: parseUnits('0.997', 8),
        maxPrice: parseUnits('1.003', 8)
    }
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const networkConfig = configs[hre.network.config.chainId!];

    await deployTokenDataFeed(
        hre,
        'usdt',
        networkConfig,
    );
};

func(hre).then(console.log).catch(console.error);
