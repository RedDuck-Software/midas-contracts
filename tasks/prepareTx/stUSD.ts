import chalk from "chalk";
import { task, types } from "hardhat/config";
import { PopulatedTransaction } from "ethers";
import { ST_USD_DEPLOY_TAG } from "../../deploy/deploy_stUSD";
import { logPopulatedTx } from "..";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export const getStUsd = async (hre: HardhatRuntimeEnvironment) => {
    const { get } = hre.deployments;
    const stUsd = await get(ST_USD_DEPLOY_TAG);
    return await hre.ethers.getContractAt('stUSD', stUsd.address);
}


task('prepareTx:stUsd:mint')
    .addPositionalParam('to', undefined, undefined, types.string)
    .addPositionalParam('amount', undefined, undefined, types.float)
    .setAction(async ({
        to, amount
    }, hre) => {
        const amountParsed = hre.ethers.utils.parseUnits(amount.toString())

        const stUsdContract = await getStUsd(hre);

        const populatedTx = await stUsdContract.populateTransaction.mint(to, amountParsed);

        logPopulatedTx(
            populatedTx
        )
    })


task('prepareTx:stUsd:burn')
    .addPositionalParam('from', undefined, undefined, types.string)
    .addPositionalParam('amount', undefined, undefined, types.float)
    .setAction(async ({
        from, amount
    }, hre) => {

        const amountParsed = hre.ethers.utils.parseUnits(amount.toString())
        const stUsdContract = await getStUsd(hre);

        const populatedTx = await stUsdContract.populateTransaction.burn(from, amountParsed);

        logPopulatedTx(
            populatedTx
        )
    })

task('prepareTx:stUsd:pause')
    .setAction(async (_, hre) => {

        const stUsdContract = await getStUsd(hre);

        const populatedTx = await stUsdContract.populateTransaction.pause();

        logPopulatedTx(
            populatedTx
        )
    })

task('prepareTx:stUsd:unpause')
    .setAction(async (_, hre) => {
        const stUsdContract = await getStUsd(hre);

        const populatedTx = await stUsdContract.populateTransaction.unpause();

        logPopulatedTx(
            populatedTx
        )
    })

task('prepareTx:stUsd:setMetadata')
    .addPositionalParam('key', undefined, undefined, types.string)
    .addPositionalParam('value', undefined, undefined, types.string)
    .setAction(async ({
        key, value
    }, hre) => {
        const keyBytes32 = hre.ethers.utils.solidityKeccak256(['string'], [key]);
        const valueBytes = hre.ethers.utils.defaultAbiCoder.encode(['string'], [value]);

        const stUsdContract = await getStUsd(hre);

        const populatedTx = await stUsdContract.populateTransaction.setMetadata(
            keyBytes32,
            valueBytes
        );

        logPopulatedTx(
            populatedTx
        )
    })


task('prepareTx:stUsd:addToBlackList')
    .addPositionalParam('account', undefined, undefined, types.string)
    .setAction(async ({
        account
    }, hre) => {
        const stUsdContract = await getStUsd(hre);

        const populatedTx = await stUsdContract.populateTransaction.addToBlackList(
            account,
        );

        logPopulatedTx(
            populatedTx
        )
    })

task('prepareTx:stUsd:removeFromBlackList')
    .addPositionalParam('account', undefined, undefined, types.string)
    .setAction(async ({
        account
    }, hre) => {
        const stUsdContract = await getStUsd(hre);

        const populatedTx = await stUsdContract.populateTransaction.removeFromBlackList(
            account,
        );

        logPopulatedTx(
            populatedTx
        )
    })