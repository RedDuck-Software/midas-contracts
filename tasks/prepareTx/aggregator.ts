import { task, types } from "hardhat/config";
import { logPopulatedTx } from "..";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export const getAggregator = async (hre: HardhatRuntimeEnvironment) => {
    const { get } = hre.deployments;
    const aggregator = await get('AggregatorV3Mock');
    return await hre.ethers.getContractAt('AggregatorV3Mock', aggregator.address);
}


task('prepareTx:aggregator:setRoundData')
    .addPositionalParam('data', undefined, undefined, types.float)
    .setAction(async ({
        data
    }, hre) => {
        const aggregatorContract = await getAggregator(hre);

        const dataParsed = hre.ethers.utils.parseUnits(
            data.toString(),
            await aggregatorContract.decimals()
        )

        const populatedTx = await aggregatorContract.populateTransaction.setRoundData(
            dataParsed
        );

        logPopulatedTx(
            populatedTx
        )
    })
