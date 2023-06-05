import { formatUnits, parseUnits } from "ethers/lib/utils";
import { defaultDeploy } from "./fixtures";
import { amountToBase18 } from "./common.helpers";

type CommonParams = Pick<
    Awaited<ReturnType<typeof defaultDeploy>>,
    'mockedAggregator'
>;

export const setRoundData = async (
    { mockedAggregator }: CommonParams,
    newPrice: number
) => {
    const decimals = await mockedAggregator.decimals();
    const parsedPrice = parseUnits(newPrice.toString(), decimals);
    await mockedAggregator.setRoundData(parsedPrice);
    return amountToBase18(decimals, parsedPrice) ;
}

export const getRoundData = async (
    { mockedAggregator }: CommonParams
) => {
    const decimals = await mockedAggregator.decimals();
    const data =await mockedAggregator.latestRoundData();
    return amountToBase18(decimals, data.answer).then(v=> +formatUnits(v));
}