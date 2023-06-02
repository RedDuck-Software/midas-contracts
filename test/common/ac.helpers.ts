import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { getAddress } from "ethers/lib/utils"
import { AccessControl__factory, Blacklistable, MidasAccessControl } from "../../typechain-types"
import { Account, OptionalCommonParams, getAccount } from "./common.helpers"
import { expect } from "chai"

type CommonParams = { 
    blacklistable: Blacklistable, 
    accessControl: MidasAccessControl,
    owner: SignerWithAddress 
}

export const acRevertMessage = (address: string, role: string) => {
    return `AccessControl: account ${getAddress(address)} is missing role ${role}`
}

export const acErrors = { 
    WMAC_HASNT_ROLE: 'WMAC: hasnt role',
    WMAC_HAS_ROLE: 'WMAC: has role',
}

export const blackList = async (
    { 
        blacklistable, 
        accessControl, 
        owner
    }: CommonParams,
    account: Account,
    opt?: OptionalCommonParams
) => {
    account = getAccount(account);

    if (opt?.revertMessage) {
        await expect(blacklistable.connect(opt?.from ?? owner).addToBlackList(account))
            .revertedWith(opt?.revertMessage);
        return;
    }

    await expect(blacklistable.connect(owner).addToBlackList(account))
        .to.emit(accessControl, accessControl.interface.events['RoleGranted(bytes32,address,address)'].name)
        .to.not.reverted
}