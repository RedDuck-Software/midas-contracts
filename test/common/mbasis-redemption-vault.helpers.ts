import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { OptionalCommonParams, getAccount } from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
  ERC20,
  // eslint-disable-next-line camelcase
  ERC20__factory,
  MBasisRedemptionVaultWithSwapper,
} from '../../typechain-types';

type CommonParamsRedeem = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  | 'owner'
  | 'mTBILL'
  | 'mBASIS'
  | 'mBasisRedemptionVaultWithSwapper'
  | 'mBASISToUsdDataFeed'
  | 'mTokenToUsdDataFeed'
>;

export const redeemInstantWithSwapperTest = async (
  {
    mBasisRedemptionVaultWithSwapper,
    owner,
    mTBILL,
    mBASIS,
    mBASISToUsdDataFeed,
    mTokenToUsdDataFeed,
    swap,
  }: CommonParamsRedeem & { swap?: boolean },
  tokenOut: ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(tokenOut, owner);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountTBillIn.toString());
  const tokensReceiver =
    await mBasisRedemptionVaultWithSwapper.tokensReceiver();
  const feeReceiver = await mBasisRedemptionVaultWithSwapper.feeReceiver();

  if (opt?.revertMessage) {
    await expect(
      mBasisRedemptionVaultWithSwapper
        .connect(sender)
        .redeemInstant(tokenOut, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeUserMTBILL = await mTBILL.balanceOf(sender.address);
  const balanceBeforeUserMBASIS = await mBASIS.balanceOf(sender.address);

  const balanceBeforeContractMTBILL = await mTBILL.balanceOf(
    mBasisRedemptionVaultWithSwapper.address,
  );
  const balanceBeforeContractMBASIS = await mBASIS.balanceOf(
    mBasisRedemptionVaultWithSwapper.address,
  );

  const balanceBeforeReceiverMTBILL = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeReceiverMBASIS = await mBASIS.balanceOf(tokensReceiver);

  const balanceBeforeFeeReceiverMTBILL = await mTBILL.balanceOf(feeReceiver);
  const balanceBeforeFeeReceiverMBASIS = await mBASIS.balanceOf(feeReceiver);

  const balanceBeforeTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyBeforeMTBILL = await mTBILL.totalSupply();
  const supplyBeforeMBASIS = await mBASIS.totalSupply();

  const mBasisRate = await mBASISToUsdDataFeed.getDataInBase18();
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { fee, amountOut, amountInWithoutFee } =
    await calcExpectedTokenOutAmount(
      sender,
      tokenContract,
      mBasisRedemptionVaultWithSwapper,
      mBasisRate,
      amountIn,
      true,
    );

  const expectedMToken = amountInWithoutFee.mul(mBasisRate).div(mTokenRate);

  await expect(
    mBasisRedemptionVaultWithSwapper
      .connect(sender)
      .redeemInstant(tokenOut, amountIn),
  )
    .to.emit(
      mBasisRedemptionVaultWithSwapper,
      mBasisRedemptionVaultWithSwapper.interface.events[
        'RedeemInstant(address,address,uint256,uint256,uint256)'
      ].name,
    )
    .withArgs(sender, tokenOut, amountTBillIn, fee, amountOut).to.not.reverted;

  const balanceAfterUserMTBILL = await mTBILL.balanceOf(sender.address);
  const balanceAfterUserMBASIS = await mBASIS.balanceOf(sender.address);

  const balanceAfterContractMTBILL = await mTBILL.balanceOf(
    mBasisRedemptionVaultWithSwapper.address,
  );
  const balanceAfterContractMBASIS = await mBASIS.balanceOf(
    mBasisRedemptionVaultWithSwapper.address,
  );

  const balanceAfterReceiverMTBILL = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterReceiverMBASIS = await mBASIS.balanceOf(tokensReceiver);

  const balanceAfterFeeReceiverMTBILL = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterFeeReceiverMBASIS = await mBASIS.balanceOf(feeReceiver);

  const balanceAfterTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyAfterMTBILL = await mTBILL.totalSupply();
  const supplyAfterMBASIS = await mBASIS.totalSupply();

  expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut.add(amountOut));

  expect(balanceAfterUserMBASIS).eq(balanceBeforeUserMBASIS.sub(amountIn));
  expect(balanceAfterUserMTBILL).eq(balanceBeforeUserMTBILL);

  expect(balanceAfterReceiverMTBILL).eq(balanceBeforeReceiverMTBILL);
  expect(balanceAfterReceiverMBASIS).eq(balanceBeforeReceiverMBASIS);

  expect(balanceAfterFeeReceiverMTBILL).eq(balanceBeforeFeeReceiverMTBILL);
  expect(balanceAfterFeeReceiverMBASIS).eq(
    balanceBeforeFeeReceiverMBASIS.add(fee),
  );

  if (swap) {
    expect(supplyAfterMTBILL).eq(supplyBeforeMTBILL.sub(expectedMToken));
    expect(balanceAfterContractMBASIS).eq(
      balanceBeforeContractMBASIS.add(amountInWithoutFee),
    );
    expect(balanceAfterContractMTBILL).eq(
      balanceBeforeContractMTBILL.sub(expectedMToken),
    );
  } else {
    expect(supplyAfterMBASIS).eq(supplyBeforeMBASIS.sub(amountInWithoutFee));
    expect(balanceAfterContractMBASIS).eq(balanceBeforeContractMBASIS);
    expect(balanceAfterContractMTBILL).eq(balanceBeforeContractMTBILL);
  }
};

const getFeePercent = async (
  sender: string,
  token: string,
  redemptionVault: MBasisRedemptionVaultWithSwapper,
  isInstant: boolean,
  additionalFee?: BigNumber,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token);
  let feePercent = constants.Zero;
  const isWaived = await redemptionVault.waivedFeeRestriction(sender);
  if (!isWaived) {
    feePercent = additionalFee ?? tokenConfig.fee;
    if (isInstant) {
      const instantFee = await redemptionVault.instantFee();
      feePercent = feePercent.add(instantFee);
    }
  }
  return feePercent;
};

const calcExpectedTokenOutAmount = async (
  sender: SignerWithAddress,
  token: ERC20,
  redemptionVault: MBasisRedemptionVaultWithSwapper,
  mTokenRate: BigNumber,
  amountIn: BigNumber,
  isInstant: boolean,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token.address);
  // eslint-disable-next-line camelcase
  const dataFeedContract = DataFeedTest__factory.connect(
    tokenConfig.dataFeed,
    sender,
  );
  const currentStableRate = await dataFeedContract.getDataInBase18();
  if (currentStableRate.isZero())
    return {
      amountOut: constants.Zero,
      amountInWithoutFee: constants.Zero,
      fee: constants.Zero,
      currentStableRate: constants.Zero,
    };

  const feePercent = await getFeePercent(
    sender.address,
    token.address,
    redemptionVault,
    isInstant,
  );

  const hundredPercent = await redemptionVault.ONE_HUNDRED_PERCENT();
  const fee = amountIn.mul(feePercent).div(hundredPercent);

  const amountInWithoutFee = amountIn.sub(fee);

  const tokenDecimals = await token.decimals();

  const amountOut = amountInWithoutFee
    .mul(mTokenRate)
    .div(currentStableRate)
    .div(10 ** (18 - tokenDecimals));

  return {
    amountOut,
    amountInWithoutFee,
    fee,
    currentStableRate,
  };
};
