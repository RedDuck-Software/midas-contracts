import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { acErrors, greenList } from './common/ac.helpers';
import { mintToken } from './common/common.helpers';
import { setRoundData } from './common/data-feed.helpers';
import { defaultDeploy } from './common/fixtures';
import { addPaymentTokenTest } from './common/manageable-vault.helpers';
import {
  cancelRedemptionRequestTest,
  fulfillRedemptionRequestTest,
  // getOutputAmountWithFeeRedeemTest,
  redeem,
  manualRedeemTest,
} from './common/redemption-vault.helpers';

describe('RedemptionVault', function () {
  it('deployment', async () => {
    const { redemptionVault, mTBILL, dataFeed, roles } = await loadFixture(
      defaultDeploy,
    );

    expect(await redemptionVault.mTBILL()).eq(mTBILL.address);

    expect(await redemptionVault.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await redemptionVault.lastRequestId()).eq('0');

    expect(await redemptionVault.vaultRole()).eq(roles.redemptionVaultAdmin);

    expect(await redemptionVault.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
  });

  it('initialize()', async () => {
    const { redemptionVault } = await loadFixture(defaultDeploy);

    await expect(
      redemptionVault.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('Initializable: contract is already initialized');
  });

  describe('initiateRedemptionRequest()', () => {
    it('should fail: call from address without GREENLISTED_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, mTBILL, stableCoins } =
        await loadFixture(defaultDeploy);

      await redeem(
        { redemptionVault, owner, mTBILL },
        stableCoins.dai,
        0,
        {
          revertMessage: acErrors.WMAC_HASNT_ROLE,
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when there is no token in vault', async () => {
      const { owner, redemptionVault, accessControl, stableCoins, mTBILL } =
        await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );
      await redeem(
        { redemptionVault, owner, mTBILL },
        stableCoins.dai,
        0,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when 0 amount passed', async () => {
      const { owner, redemptionVault, accessControl, stableCoins, mTBILL } =
        await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await redeem(
        { redemptionVault, owner, mTBILL },
        stableCoins.dai,
        0,
        {
          revertMessage: 'RV: 0 amount',
        },
      );
    });

    it('should fail: when is on pause', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        manualFulfillmentToken,
        stableCoins,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      await expect(redemptionVault.changePauseState(true)).to.emit(
        redemptionVault,
        redemptionVault.interface.events['ChangeState(bool)'].name,
      ).to.not.reverted;
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        regularAccounts[0],
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(mTBILL, regularAccounts[0].address, 1);
      await redeem(
        { redemptionVault, owner, mTBILL },
        manualFulfillmentToken,
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'P: is on pause',
        },
      );
    });

    it('is on pause but admin can do everything', async () => {
      const { owner, redemptionVault, accessControl, stableCoins, mTBILL } =
        await loadFixture(defaultDeploy);
      await expect(redemptionVault.changePauseState(true)).to.emit(
        redemptionVault,
        redemptionVault.interface.events['ChangeState(bool)'].name,
      ).to.not.reverted;
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(mTBILL, owner, 1);
      await redeem(
        { redemptionVault, owner, mTBILL },
        stableCoins.dai,
        1,
      );
    });

    it('when token out is MANUAL_FULLFILMENT_TOKEN', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        manualFulfillmentToken,
        stableCoins,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(mTBILL, owner.address, 1);
      await redeem(
        { redemptionVault, owner, mTBILL },
        manualFulfillmentToken,
        1,
      );
    });
  });

  describe('fulfillRedemptionRequest(uint256,uint256)', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, mTBILL } =
        await loadFixture(defaultDeploy);

      await fulfillRedemptionRequestTest(
        { redemptionVault, owner, mTBILL },
        {
          revertMessage: acErrors.WMAC_HASNT_ROLE,
          from: regularAccounts[0],
        },
      )['fulfillRedemptionRequest(uint256,uint256)'](1, 0);
    });

    it('should fail: when request with provided id does`nt exists', async () => {
      const { owner, redemptionVault, mTBILL } = await loadFixture(
        defaultDeploy,
      );
      await fulfillRedemptionRequestTest(
        { redemptionVault, owner, mTBILL },
        {
          revertMessage: 'RV: r not exists',
        },
      )['fulfillRedemptionRequest(uint256,uint256)'](1, 0);
    });

    it('should fail: when contract has insufficient balance', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      const users = regularAccounts[0];
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        users,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(mTBILL, users.address, 1);

      await redeem(
        { redemptionVault, owner, mTBILL },
        stableCoins.dai,
        1,
        { from: users },
      );

      await fulfillRedemptionRequestTest(
        { redemptionVault, owner, mTBILL },
        {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      )['fulfillRedemptionRequest(uint256,uint256)'](1, 1);
    });

    it('when request is exists and contract has sufficient balance', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      const users = regularAccounts[0];
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        users,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(mTBILL, users.address, 1);
      await mintToken(stableCoins.dai, redemptionVault.address, 100);

      await redeem(
        { redemptionVault, owner, mTBILL },
        stableCoins.dai,
        1,
        { from: users },
      );

      await fulfillRedemptionRequestTest({ redemptionVault, owner, mTBILL })[
        'fulfillRedemptionRequest(uint256,uint256)'
      ](1, 1);
    });

    it('when request is exists and tokenOut is MANUAL_FULLFILMENT_TOKEN', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        mTBILL,
        manualFulfillmentToken,
      } = await loadFixture(defaultDeploy);
      const users = regularAccounts[0];
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        users,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(mTBILL, users.address, 1);

      await redeem(
        { redemptionVault, owner, mTBILL },
        manualFulfillmentToken,
        1,
        { from: users },
      );

      await fulfillRedemptionRequestTest({ redemptionVault, owner, mTBILL })[
        'fulfillRedemptionRequest(uint256,uint256)'
      ](1, 1);
    });
  });

  describe('cancelRedemptionRequest()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, mTBILL } =
        await loadFixture(defaultDeploy);

      await cancelRedemptionRequestTest({ redemptionVault, owner, mTBILL }, 0, {
        revertMessage: acErrors.WMAC_HASNT_ROLE,
        from: regularAccounts[0],
      });
    });

    it('should fail: when request with provided id does`nt exists', async () => {
      const { owner, redemptionVault, mTBILL } = await loadFixture(
        defaultDeploy,
      );
      await cancelRedemptionRequestTest({ redemptionVault, owner, mTBILL }, 0, {
        revertMessage: 'RV: r not exists',
      });
    });

    it('when request id is valid and request tokenOut is DAI', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      const users = regularAccounts[0];
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        users,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(mTBILL, users.address, 1);

      await redeem(
        { redemptionVault, owner, mTBILL },
        stableCoins.dai,
        1,
        { from: users },
      );

      await cancelRedemptionRequestTest({ redemptionVault, owner, mTBILL }, 1);
    });

    it('when request id is valid and request tokenOut is MANUAL_FULLFILMENT_TOKEN', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        manualFulfillmentToken,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      const users = regularAccounts[0];
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        users,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(mTBILL, users.address, 1);

      await redeem(
        { redemptionVault, owner, mTBILL },
        manualFulfillmentToken,
        1,
        { from: users },
      );

      await cancelRedemptionRequestTest({ redemptionVault, owner, mTBILL }, 1);
    });
  });

  describe('manuallyRedeem(address,address,uint256,uint256)', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, mTBILL } =
        await loadFixture(defaultDeploy);

      await manualRedeemTest(
        { redemptionVault, owner, mTBILL },
        {
          revertMessage: acErrors.WMAC_HASNT_ROLE,
          from: regularAccounts[0],
        },
      )['manuallyRedeem(address,address,uint256,uint256)'](
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        0,
      );
    });

    it('should fail: when token out is not exists', async () => {
      const { owner, redemptionVault, regularAccounts, stableCoins, mTBILL } =
        await loadFixture(defaultDeploy);
      await manualRedeemTest(
        { redemptionVault, owner, mTBILL },
        {
          revertMessage: 'MV: token not exists',
        },
      )['manuallyRedeem(address,address,uint256,uint256)'](
        regularAccounts[0],
        stableCoins.dai,
        1,
        0,
      );
    });

    it('should fail: when both amounts are 0', async () => {
      const { owner, redemptionVault, stableCoins, mTBILL } = await loadFixture(
        defaultDeploy,
      );
      await manualRedeemTest(
        { redemptionVault, owner, mTBILL },
        {
          revertMessage: 'RV: invalid amounts',
        },
      )['manuallyRedeem(address,address,uint256,uint256)'](
        ethers.constants.AddressZero,
        stableCoins.dai,
        0,
        0,
      );
    });

    it('should fail: when user is address(0)', async () => {
      const { owner, redemptionVault, stableCoins, mTBILL } = await loadFixture(
        defaultDeploy,
      );
      await manualRedeemTest(
        { redemptionVault, owner, mTBILL },
        {
          revertMessage: 'RV: invalid user',
        },
      )['manuallyRedeem(address,address,uint256,uint256)'](
        ethers.constants.AddressZero,
        stableCoins.dai,
        1,
        0,
      );
    });

    it('should fail: when user`s mTBILL balance is insufficient', async () => {
      const { owner, redemptionVault, regularAccounts, stableCoins, mTBILL } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await manualRedeemTest(
        { redemptionVault, owner, mTBILL },
        {
          revertMessage: 'ERC20: burn amount exceeds balance',
        },
      )['manuallyRedeem(address,address,uint256,uint256)'](
        regularAccounts[0],
        stableCoins.dai,
        1,
        0,
      );
    });

    it('when contracts has sufficient balance', async () => {
      const { owner, redemptionVault, regularAccounts, stableCoins, mTBILL } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await mintToken(mTBILL, regularAccounts[0].address, 1);
      await mintToken(stableCoins.dai, redemptionVault.address, 1);

      await manualRedeemTest({ redemptionVault, owner, mTBILL })[
        'manuallyRedeem(address,address,uint256,uint256)'
      ](regularAccounts[0], stableCoins.dai, 1, 1);
    });

    it('when amountTBillIn is 0 and amountUsdOut is not 0', async () => {
      const { owner, redemptionVault, regularAccounts, stableCoins, mTBILL } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await mintToken(stableCoins.dai, redemptionVault, 1);

      await manualRedeemTest({ redemptionVault, owner, mTBILL })[
        'manuallyRedeem(address,address,uint256,uint256)'
      ](regularAccounts[0], stableCoins.dai, 0, 1);
    });

    it('when amountTBillIn is not 0 and amountUsdOut is 0', async () => {
      const { owner, redemptionVault, regularAccounts, stableCoins, mTBILL } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await mintToken(mTBILL, regularAccounts[0].address, 1);

      await manualRedeemTest({ redemptionVault, owner, mTBILL })[
        'manuallyRedeem(address,address,uint256,uint256)'
      ](regularAccounts[0], stableCoins.dai, 1, 0);
    });
  });
});
