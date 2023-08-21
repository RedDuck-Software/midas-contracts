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

export const midasAddressesPerNetwork: ConfigPerNetwork<
  MidasAddresses | undefined
> = {
  main: undefined,
  sepolia: {
    depositVault: '0xc2c78dcb340935509634B343840fAa5052367f29',
    redemptionVault: '0xbCe90740A9C6B59FC1D45fdc0e1F3b6C795c85dC',
    stUSD: '0xDd82C21F721746Bd77D84E8B05EdDED0f8e50980',
    etfDataFeed: '0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E',
    eurToUsdFeed: '0xE23c07Ecad6D822500CbE8306d72A90578CA9F11',
    accessControl: '0x44af5F38a9b4bf70696fa1bE922e70c2Af679FD7',
  },
  hardhat: {
    depositVault: '',
    redemptionVault: '',
    stUSD: '0xDF7d31CC8FD536F442Db48400567388cC019841b',
    etfDataFeed: '',
    eurToUsdFeed: '',
    accessControl: '0x53D493424694874Edb368144b60b5F36C6c70c37',
  },
  localhost: {
    depositVault: '0x9a43d3d57B5E406486362d93415817b03D3Dde07',
    redemptionVault: '0xB61000d49BBe241545a055c2664365Fb42e621cc',
    stUSD: '0x31d87aCAf2DcDD24798d359E7eB7F28177A756E2',
    etfDataFeed: '0x077f991afBfBFe850FEeBC3FB3C82ed51C13BcFC',
    eurToUsdFeed: '0x38557D7a455CA53fE5a22da8a44dA565f7e8e2d2',
    accessControl: '0x53D493424694874Edb368144b60b5F36C6c70c37',
  },
};

export const getCurrentAddresses = (hre: HardhatRuntimeEnvironment) => {
  return (midasAddressesPerNetwork as any)[hre.network.name] as
    | MidasAddresses
    | undefined;
};
