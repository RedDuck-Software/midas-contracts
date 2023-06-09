import { ConfigPerNetwork } from "../types/index"

export interface MidasAddresses {
    depositVault: string,
    redemptionVault: string,
    stUSD: string,
    etfDataFeed: string,
    eurToUsdFeed: string,
}

export const MidasAddressesPerNetwork: ConfigPerNetwork<MidasAddresses | undefined> = {
    main: undefined,
    sepolia: {
        depositVault: '',
        redemptionVault: '',
        stUSD: '',
        etfDataFeed: '',
        eurToUsdFeed: '',
    },
    hardhat: undefined,
    localhost: undefined
}