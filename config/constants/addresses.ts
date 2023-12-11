import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ConfigPerNetwork } from '../types/index';

export interface MidasAddresses {
  depositVault: string;
  redemptionVault: string;
  mTBILL: string;
  etfDataFeed: string;
  eurToUsdFeed: string;
  accessControl: string;
  tokensReceiver: string;
}

export const midasAddressesPerNetwork: ConfigPerNetwork<
  MidasAddresses | undefined
> = {
  main: {
    tokensReceiver: '',
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    depositVault: '',
    etfDataFeed: '',
    eurToUsdFeed: '',
    redemptionVault: '',
    mTBILL: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
  },
  sepolia: {
    tokensReceiver: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
    depositVault: '0xE85f2B707Ec5Ae8e07238F99562264f304E30109',
    redemptionVault: '0xf3482c80d1A2883611De939Af7b0a970d5fcdC06',
    mTBILL: '0xefED40D1eb1577d1073e9C4F277463486D39b084',
    etfDataFeed: '0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E',
    eurToUsdFeed: '0xE23c07Ecad6D822500CbE8306d72A90578CA9F11',
    accessControl: '0xbf25b58cB8DfaD688F7BcB2b87D71C23A6600AaC',
  },
  hardhat: undefined,
  localhost: {
    tokensReceiver: '',
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    depositVault: '0xf6835A934F2E12D33b357cD89Bd9beD3Be37f321',
    etfDataFeed: '0xB1f752624ad00b88a4830E3ae9184D64bbF48cad',
    eurToUsdFeed: '0xf4c6D1B597EC392bAF9685BA8631cDe33020B913',
    redemptionVault: '0x10Da412782649A40c487f20101266098f1671145',
    mTBILL: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
  },
};

export const getCurrentAddresses = (hre: HardhatRuntimeEnvironment) => {
  return (midasAddressesPerNetwork as any)[hre.network.name] as
    | MidasAddresses
    | undefined;
};
