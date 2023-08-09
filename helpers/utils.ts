import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';
import {
  BigNumberish,
  constants,
  Contract,
  ContractReceipt,
  ContractTransaction,
  Signature,
} from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import fs from 'fs';

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getImplAddressFromProxy = async (
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
): Promise<string> =>
  await getImplementationAddress(hre.ethers.provider, proxyAddress);

export const logDeploy = (
  contractName: string,
  contractType: string | undefined,
  address: string,
) =>
  console.info(
    `\x1b[32m${contractName}\x1b[0m${contractType ? ' ' : ''}${
      contractType ?? ''
    }:\t`,
    '\x1b[36m',
    address,
    '\x1b[0m',
  );

export const etherscanVerify = async (
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  ...constructorArguments: unknown[]
) => {
  const network = hre.network.name;
  if (network === 'localhost' || network === 'hardhat') return;
  await verify(hre, contractAddress, ...constructorArguments);
};

export const etherscanVerifyImplementation = async (
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ...constructorArguments: unknown[]
) => {
  const contractAddress = await getImplAddressFromProxy(hre, proxyAddress);
  return etherscanVerify(hre, contractAddress, ...constructorArguments);
};

export const logDeployProxy = async (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  address: string,
) => {
  logDeploy(contractName, 'Proxy', address);

  try {
    logDeploy(
      contractName,
      'Impl',
      await getImplAddressFromProxy(hre, address),
    );
  } catch (err) {
    console.error('Log impl error. ', err);
  }
};

export const tryEtherscanVerify = async (
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  ...constructorArguments: unknown[]
) => {
  return await etherscanVerify(hre, contractAddress, ...constructorArguments)
    .catch((err) => {
      console.error('Unable to verify. Error: ', err);
      return false;
    })
    .then((_) => {
      return true;
    });
};

export const tryEtherscanVerifyImplementation = async (
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ...constructorArguments: unknown[]
) => {
  return await etherscanVerifyImplementation(
    hre,
    proxyAddress,
    ...constructorArguments,
  )
    .catch((err) => {
      console.error('Unable to verify. Error: ', err);
      return false;
    })
    .then((_) => {
      return true;
    });
};

export const processDeployer = async (
  deployer: any,
  hre: HardhatRuntimeEnvironment,
): Promise<SignerWithAddress> => {
  if (deployer && !hre.ethers.utils.isAddress(deployer))
    throw new Error('Deployer address is invalid');

  const [owner] = deployer
    ? [await hre.ethers.getSigner(deployer)]
    : await hre.ethers.getSigners();

  return owner;
};

export const processAddress = (
  address: unknown,
  hre: HardhatRuntimeEnvironment,
  name = 'Current',
): void => {
  if (
    !address ||
    typeof address !== 'string' ||
    !hre.ethers.utils.isAddress(address)
  ) {
    throw new Error(`${name} address is invalid`);
  }
};

export const verify = async (
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  ...constructorArguments: any[]
) => {
  console.log('Arguments: ', constructorArguments);

  await hre.run('verify:verify', {
    address: contractAddress,
    constructorArguments,
  });
};
