import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ConfigPerNetwork } from '../types/index';

export interface MidasAddresses {
  depositVault: string;
  redemptionVault: string;
  stUSD: string;
  etfDataFeed: string;
  eurToUsdFeed: string;
  accessControl: string;
}

export const midasAddressesPerNetwork: ConfigPerNetwork<MidasAddresses | undefined> = {
  main: undefined,
  sepolia: {
    depositVault: '0xc2c78dcb340935509634B343840fAa5052367f29',
    redemptionVault: '0xbCe90740A9C6B59FC1D45fdc0e1F3b6C795c85dC',
    stUSD: '0xDd82C21F721746Bd77D84E8B05EdDED0f8e50980',
    etfDataFeed: '0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E',
    eurToUsdFeed: '0xE23c07Ecad6D822500CbE8306d72A90578CA9F11',
    accessControl: '0x44af5F38a9b4bf70696fa1bE922e70c2Af679FD7',
  },
  hardhat: undefined,
  localhost: {
    accessControl: '0xf6DBc2CA922C9a622a2Ca6cda1A9D5a22d656136',
    depositVault: '0xf6835A934F2E12D33b357cD89Bd9beD3Be37f321',
    etfDataFeed: '0xB1f752624ad00b88a4830E3ae9184D64bbF48cad',
    eurToUsdFeed: '0xf4c6D1B597EC392bAF9685BA8631cDe33020B913',
    redemptionVault: '0x10Da412782649A40c487f20101266098f1671145',
    stUSD: '0xd6f1374eBcd1f9D5FF04447b92597Dceafbbf45f',
  },
};

export const getCurrentAddresses = (hre: HardhatRuntimeEnvironment) => {
  return (midasAddressesPerNetwork as any)[hre.network.name] as
    | MidasAddresses
    | undefined;
};
