import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

export type OptionalCommonParams = {
    from?: SignerWithAddress,
    revertMessage?: string
}

export type Account = SignerWithAddress | string;

export const getAccount = (account: Account) => { 
    return (account as SignerWithAddress).address ?? account as string;
}