import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
} from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
  DepositVaultTest,
  ERC20,
  // eslint-disable-next-line camelcase
  ERC20__factory,
} from '../../typechain-types';

type CommonParamsDeposit = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVault' | 'owner' | 'mTBILL'
>;

export const deposit = async (
  {
    depositVault,
    owner,
    mTBILL,
    waivedFee,
  }: CommonParamsDeposit & { waivedFee?: boolean },
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const sender = opt?.from ?? owner;
  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(tokenIn, owner);

  const tokensReceiver = await depositVault.tokensReceiver();
  const feeReceiver = await depositVault.feeReceiver();

  const amountIn = parseUnits(amountUsdIn.toFixed(18).replace(/\.?0+$/, ''));

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).depositInstant(tokenIn, amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceBeforeContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceBeforeUser = await balanceOfBase18(
    tokenContract,
    sender.address,
  );
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, sender.address);

  const totalDepositedBefore = await depositVault.totalDeposited(
    sender.address,
  );

  const { fee, mintAmount, amountInWithoutFee } = await calcExpectedMintAmount(
    sender,
    tokenIn,
    depositVault,
    amountIn,
    true,
  );

  await expect(depositVault.connect(sender).depositInstant(tokenIn, amountIn))
    .to.emit(
      depositVault,
      depositVault.interface.events[
        'Deposit(address,address,uint256,uint256,uint256)'
      ].name,
    )
    .withArgs(
      sender.address,
      tokenContract.address,
      amountUsdIn,
      fee,
      mintAmount,
    ).to.not.reverted;

  const totalDepositedAfter = await depositVault.totalDeposited(sender.address);

  const balanceAfterContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceAfterContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);
  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, sender.address);

  expect(balanceMtBillAfterUser.sub(balanceMtBillBeforeUser)).eq(mintAmount);
  expect(totalDepositedAfter).eq(totalDepositedBefore.add(amountIn));
  expect(balanceAfterContract).eq(
    balanceBeforeContract.add(amountInWithoutFee),
  );
  expect(feeReceiverBalanceAfterContract).eq(
    feeReceiverBalanceBeforeContract.add(fee),
  );
  if (waivedFee) {
    expect(feeReceiverBalanceAfterContract).eq(
      feeReceiverBalanceBeforeContract,
    );
  }
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
};

export const calcExpectedMintAmount = async (
  sender: SignerWithAddress,
  token: string,
  depositVault: DepositVaultTest,
  amountIn: BigNumber,
  isInstant: boolean,
) => {
  const tokenConfig = await depositVault.tokensConfig(token);
  // eslint-disable-next-line camelcase
  const dataFeedContract = DataFeedTest__factory.connect(
    tokenConfig.dataFeed,
    sender,
  );
  const currentRate = await dataFeedContract.getDataInBase18();
  if (currentRate.isZero())
    return {
      mintAmount: constants.Zero,
      amountInWithoutFee: constants.Zero,
      fee: constants.Zero,
    };

  let feePercent = constants.Zero;
  const isWaived = await depositVault.waivedFeeRestriction(sender.address);
  if (!isWaived) {
    feePercent = tokenConfig.fee;
    if (isInstant) {
      const instantFee = await depositVault.initialFee();
      feePercent = feePercent.add(instantFee);
    }
  }

  const hundredPercent = await depositVault.ONE_HUNDRED_PERCENT();
  const fee = amountIn.mul(feePercent).div(hundredPercent);

  const amountInWithoutFee = amountIn.sub(fee);

  return {
    mintAmount: amountInWithoutFee.mul(constants.WeiPerEther).div(currentRate),
    amountInWithoutFee,
    fee,
  };
};
