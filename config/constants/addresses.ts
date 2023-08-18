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
    depositVault: '0x9fbE2b4c7132F97aA9B85b8197ddc55068dF6FF4',
    redemptionVault: '0x5c05D18E86dE36cB34Ac97946FC900b67c296288',
    stUSD: '0xDF7d31CC8FD536F442Db48400567388cC019841b',
    etfDataFeed: '0xd7541dd188FD2499EDC9EeF33e62BCbae78D3426',
    eurToUsdFeed: '0xE23c07Ecad6D822500CbE8306d72A90578CA9F11',
    accessControl: '0x31b380DD71Ba166ADb2285adAa5bE10532c4e627',
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
