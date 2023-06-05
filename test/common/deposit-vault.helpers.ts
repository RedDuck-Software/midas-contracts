import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import { defaultAbiCoder, formatUnits, parseUnits, solidityKeccak256 } from 'ethers/lib/utils';

import { Account, OptionalCommonParams, balanceOfBase18, getAccount, tokenAmountToBase18 } from './common.helpers';
import { defaultDeploy } from './fixtures';
import { AggregatorV3Mock__factory, DataFeed__factory, ERC20, ERC20__factory } from '../../typechain-types';
import { getRoundData, setRoundData } from './data-feed.helpers';
import { ethers } from 'hardhat';

type CommonParams = Pick<
    Awaited<ReturnType<typeof defaultDeploy>>,
    'depositVault' | 'owner'
>;

type CommonParamsDeposit = Pick<
    Awaited<ReturnType<typeof defaultDeploy>>,
    'depositVault' | 'owner' | 'stUSD'
>;


type CommonParamsGetOutputAmount = Pick<
    Awaited<ReturnType<typeof defaultDeploy>>,
    'depositVault' | 'mockedAggregator'
>;

export const addPaymentTokenTest = async (
    { depositVault, owner }: CommonParams,
    token: ERC20 | string,
    opt?: OptionalCommonParams,
) => {
    token = (token as ERC20).address ?? token as string;

    if (opt?.revertMessage) {
        await expect(
            depositVault.connect(opt?.from ?? owner).addPaymentToken(token),
        ).revertedWith(opt?.revertMessage);
        return;
    }

    await expect(
        depositVault.connect(opt?.from ?? owner).addPaymentToken(token),
    )
        .to.emit(depositVault, depositVault.interface.events['AddPaymentToken(address,address)'].name)
        .to.not.reverted;

    const paymentTokens = await depositVault.getPaymentTokens();
    expect(paymentTokens.find(v => v === token)).not.eq(undefined);
};


export const setMinAmountToDepositTest = async (
    { depositVault, owner }: CommonParams,
    valueN: number,
    opt?: OptionalCommonParams,
) => {
    const value = parseUnits(valueN.toString());

    if (opt?.revertMessage) {
        await expect(
            depositVault.connect(opt?.from ?? owner).setMinAmountToDeposit(value),
        ).revertedWith(opt?.revertMessage);
        return;
    }

    await expect(
        depositVault.connect(opt?.from ?? owner).setMinAmountToDeposit(value),
    )
        .to.emit(depositVault, depositVault.interface.events['SetMinAmountToDeposit(address,uint256)'].name)
        .to.not.reverted;

    const newMin = await depositVault.minUsdAmountToDeposit();
    expect(newMin).eq(value);
};

export const removePaymentTokenTest = async (
    { depositVault, owner }: CommonParams,
    token: ERC20 | string,
    opt?: OptionalCommonParams,
) => {
    token = (token as ERC20).address ?? token as string;

    if (opt?.revertMessage) {
        await expect(
            depositVault.connect(opt?.from ?? owner).removePaymentToken(token),
        ).revertedWith(opt?.revertMessage);
        return;
    }

    await expect(
        depositVault.connect(opt?.from ?? owner).removePaymentToken(token),
    )
        .to.emit(depositVault, depositVault.interface.events['RemovePaymentToken(address,address)'].name)
        .to.not.reverted;

    const paymentTokens = await depositVault.getPaymentTokens();
    expect(paymentTokens.find(v => v === token)).eq(undefined);
};


export const withdrawTest = async (
    { depositVault, owner }: CommonParams,
    token: ERC20 | string,
    amount: BigNumberish,
    withdrawTo: Account,
    opt?: OptionalCommonParams,
) => {
    withdrawTo = getAccount(withdrawTo);
    token = getAccount(token);

    const tokenContract = ERC20__factory.connect(token, owner);

    if (opt?.revertMessage) {
        await expect(
            depositVault.connect(opt?.from ?? owner).withdraw(
                token,
                amount,
                withdrawTo
            ),
        ).revertedWith(opt?.revertMessage);
        return;
    }

    const balanceBeforeContract = await tokenContract.balanceOf(depositVault.address);
    const balanceBeforeTo = await tokenContract.balanceOf(withdrawTo);

    await expect(
        depositVault.connect(opt?.from ?? owner).withdraw(
            token,
            amount,
            withdrawTo
        )
    )
        .to.emit(depositVault, depositVault.interface.events['Withdraw(address,address,address,uint256)'].name)
        .to.not.reverted;

    const balanceAfterContract = await tokenContract.balanceOf(depositVault.address);
    const balanceAfterTo = await tokenContract.balanceOf(withdrawTo);

    expect(balanceAfterContract).eq(balanceBeforeContract.sub(amount));
    expect(balanceAfterTo).eq(balanceBeforeTo.add(amount));
};


export const depositTest = async (
    { depositVault, owner, stUSD }: CommonParamsDeposit,
    tokenIn: ERC20 | string,
    amountUsdIn: number,
    opt?: OptionalCommonParams,
) => {

    tokenIn = getAccount(tokenIn);

    const sender = opt?.from ?? owner;
    const tokenContract = ERC20__factory.connect(tokenIn, owner);

    const amountIn = parseUnits(amountUsdIn.toString());

    if (opt?.revertMessage) {
        await expect(
            depositVault.connect(sender).deposit(
                tokenIn,
                amountIn
            ),
        ).revertedWith(opt?.revertMessage);
        return;
    }

    const balanceBeforeContract = await balanceOfBase18(tokenContract, depositVault.address);
    const balanceBeforeUser = await balanceOfBase18(tokenContract, sender.address);
    const balanceStUsdBeforeUser = await stUSD.balanceOf(sender.address);

    const dataFeed = DataFeed__factory.connect(await depositVault.etfDataFeed(), owner);
    const aggregator = AggregatorV3Mock__factory.connect(await dataFeed.aggregator(), owner);

    const expectedOutAmount = await getOutputAmountWithFeeTest({ depositVault, mockedAggregator: aggregator }, {
        amountN: amountUsdIn
    });

    await expect(
        depositVault.connect(sender).deposit(
            tokenIn,
            amountIn
        )
    )
        .to.emit(depositVault, depositVault.interface.events['Deposit(address,address,bool,uint256,uint256)'].name)
        .to.not.reverted;

    const balanceAfterContract = await balanceOfBase18(tokenContract, depositVault.address);
    const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);
    const balanceStUsdAfterUser = await stUSD.balanceOf(sender.address);

    expect(balanceAfterContract).eq(balanceBeforeContract.add(amountIn));
    expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
    expect(balanceStUsdAfterUser).eq(balanceStUsdBeforeUser.add(expectedOutAmount));
};



export const fulfillManualDepositTest = async (
    { depositVault, owner, stUSD }: CommonParamsDeposit,
    user: Account,
    amountUsdIn: number,
    opt?: OptionalCommonParams,
) => {

    user = getAccount(user);

    const sender = opt?.from ?? owner;

    const amountIn = parseUnits(amountUsdIn.toString());

    if (opt?.revertMessage) {
        await expect(
            depositVault.connect(sender).fulfillManualDeposit(
                user,
                amountIn
            ),
        ).revertedWith(opt?.revertMessage);
        return;
    }

    const balanceStUsdBeforeUser = await stUSD.balanceOf(user);

    const dataFeed = DataFeed__factory.connect(await depositVault.etfDataFeed(), owner);
    const aggregator = AggregatorV3Mock__factory.connect(await dataFeed.aggregator(), owner);

    const expectedOutAmount = await getOutputAmountWithFeeTest({ depositVault, mockedAggregator: aggregator }, {
        amountN: amountUsdIn
    });

    await expect(
        depositVault.connect(sender).fulfillManualDeposit(
            user,
            amountIn
        )
    )
        .to.emit(depositVault, depositVault.interface.events['Deposit(address,address,bool,uint256,uint256)'].name)
        .to.not.reverted;

    const balanceStUsdAfterUser = await stUSD.balanceOf(user);

    expect(balanceStUsdAfterUser).eq(balanceStUsdBeforeUser.add(expectedOutAmount));
};


export const getOutputAmountWithFeeTest = async (
    { depositVault, mockedAggregator }: CommonParamsGetOutputAmount,
    {
        priceN,
        amountN,
        feeN
    }: {
        amountN: number,
        priceN?: number,
        feeN?: number
    }
) => {
    const bps = (await depositVault.PERCENTAGE_BPS());

    priceN ??= await getRoundData({ mockedAggregator });
    feeN ??= (await depositVault.getFee()).toNumber() / bps.toNumber();

    const price = await setRoundData({ mockedAggregator }, priceN);
    const amount = parseUnits(amountN.toString());
    const fee = feeN * bps.toNumber();
    const woFee = price.eq(ethers.constants.Zero) ? ethers.constants.Zero : amount.mul(parseUnits('1')).div(price)

    const expectedValue = woFee.sub(woFee.mul(fee).div(bps.mul(100)));

    await depositVault.setFee(fee);

    const realValue = await depositVault.getOutputAmountWithFee(amount);

    expect(realValue).eq(expectedValue);

    return realValue;
}