import { parseUnits } from "ethers/lib/utils";
import { defaultDeploy } from "./fixtures";

type CommonParams = Pick<
    Awaited<ReturnType<typeof defaultDeploy>>,
    'mockedAggregator' | 'mockedAggregatorDecimals'
>;

export const setRoundData = async (
    { mockedAggregator, mockedAggregatorDecimals }: CommonParams,
    newPrice: string
) => {
    const parsedPrice = parseUnits(newPrice, mockedAggregatorDecimals);
    await mockedAggregator.setRoundData(parsedPrice);
    return parsedPrice;
}