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
    depositVault: '0xb0f198b9e141179f401E53C104454688001dC511',
    redemptionVault: '0x4C428dF013227696C27b223bcD18Dcda46CD0a3D',
    stUSD: '0x08383da6716C12d1250E735ABe7FDcDD6e96e9e9',
    etfDataFeed: '0x7838E7B02d76e58Aa7032f73D27C11134192e99d',
    eurToUsdFeed: '0xE23c07Ecad6D822500CbE8306d72A90578CA9F11',
    accessControl: '0xf93877fbc3fDcd95c09eb480dC451c4D356217bD',
  },
  hardhat: {
    depositVault: '',
    redemptionVault: '',
    stUSD: '',
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
