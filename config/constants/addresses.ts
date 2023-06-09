import { ConfigPerNetwork } from "../types/index"
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export interface MidasAddresses {
    depositVault: string,
    redemptionVault: string,
    stUSD: string,
    etfDataFeed: string,
    eurToUsdFeed: string,
    accessControl: string
}

export const midasAddressesPerNetwork: ConfigPerNetwork<MidasAddresses | undefined> = {
    main: undefined,
    sepolia: {
        depositVault: '',
        redemptionVault: '',
        stUSD: '',
        etfDataFeed: '',
        eurToUsdFeed: '',
        accessControl: '',
    },
    hardhat: undefined,
    localhost: undefined
}


export const getCurrentAddresses = (hre: HardhatRuntimeEnvironment) => { 
    return midasAddressesPerNetwork[hre.network.name] as MidasAddresses | undefined;
}