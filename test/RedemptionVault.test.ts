import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { assert, expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { acErrors, greenList } from './common/ac.helpers';
import { mintToken } from './common/common.helpers';
import { setRoundData } from './common/data-feed.helpers';
import { defaultDeploy } from './common/fixtures';
import { addPaymentTokenTest } from './common/manageable-vault.helpers';
import {
  cancelRedemptionRequestTest,
  fulfillRedemptionRequestTest,
  getOutputAmountWithFeeRedeemTest,
  initiateRedemptionRequestTest,
  manualRedeemTest,
  setMinAmountToRedeemTest,
} from './common/redemption-vault.helpers';

describe('RedemptionVault', function () {
  it('deployment', async () => {
    const { redemptionVault, stUSD, dataFeed, roles } = await loadFixture(
      defaultDeploy,
    );

    expect(await redemptionVault.stUSD()).eq(stUSD.address);

    expect(await redemptionVault.etfDataFeed()).eq(dataFeed.address);

    expect(await redemptionVault.minUsdAmountToRedeem()).eq('0');

    expect(await redemptionVault.PERCENTAGE_BPS()).eq('100');

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
        ethers.constants.AddressZero,
        0,
      ),
    ).revertedWith('Initializable: contract is already initialized');
  });

  it('setMinAmountToRedeem()', async () => {
    const { owner, redemptionVault } = await loadFixture(defaultDeploy);

    await setMinAmountToRedeemTest({ redemptionVault, owner }, 1.1);
  });

  describe('getOutputAmountWithFee()', () => {
    const test = ({
      priceN,
      amountN,
      feeN,
      expectedValue,
    }: {
      priceN: number;
      amountN: number;
      feeN: number;
      expectedValue: number;
    }) => {
      it(`price is ${priceN}$, fee is ${feeN}%, amount is ${amountN}$ return value should be ${expectedValue} stUSD`, async () => {
        const { redemptionVault, mockedAggregator, stableCoins } =
          await loadFixture(defaultDeploy);

        await redemptionVault.addPaymentToken(stableCoins.usdc.address);

        await getOutputAmountWithFeeRedeemTest(
          { redemptionVault, mockedAggregator },
          {
            priceN,
            amountN,
            feeN,
            token: stableCoins.usdc.address,
          },
        );
      });
    };

    test({ priceN: 5.1, feeN: 1, amountN: 100, expectedValue: 504.9 });
    test({ priceN: 1, feeN: 0.01, amountN: 50, expectedValue: 49.9 });
    test({ priceN: 5, feeN: 0, amountN: 100, expectedValue: 500 });
    test({ priceN: 0, feeN: 1, amountN: 100, expectedValue: 0 });
    test({ priceN: 1, feeN: 1, amountN: 0, expectedValue: 0 });
  });

  describe('initiateRedemptionRequest()', () => {
    it('should fail: call from address without GREENLISTED_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);

      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        stableCoins.dai,
        0,
        {
          revertMessage: acErrors.WMAC_HASNT_ROLE,
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );
      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        stableCoins.dai,
        0,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when 0 amount passed', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        stableCoins.dai,
        0,
        {
          revertMessage: 'RV: 0 amount',
        },
      );
    });

    it('should fail: when estimated output amount is < min', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        mockedAggregator,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await setMinAmountToRedeemTest({ redemptionVault, owner }, 1.1);
      await setRoundData({ mockedAggregator }, 1);
      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        stableCoins.dai,
        1,
        {
          revertMessage: 'RV: amount < min',
        },
      );
    });

    it('fail: is on pause', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        manualFulfillmentToken,
        stableCoins,
        stUSD,
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
      await mintToken(stUSD, regularAccounts[0].address, 1);
      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        manualFulfillmentToken,
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'P: is on pause',
        },
      );
    });

    it('is on pause but admin can do everything', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        manualFulfillmentToken,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
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
      await mintToken(stUSD, owner, 1);
      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        manualFulfillmentToken,
        1,
      );
    });

    it('when token out is MANUAL_FULLFILMENT_TOKEN', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        manualFulfillmentToken,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(stUSD, owner.address, 1);
      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        manualFulfillmentToken,
        1,
      );
    });
  });

  // describe('fulfillRedemptionRequest(uint256)', () => {
  //   it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
  //     const { redemptionVault, regularAccounts, owner, stUSD, stableCoins } =
  //       await loadFixture(defaultDeploy);

  //     await fulfillRedemptionRequestTest(
  //       { redemptionVault, owner, stUSD },
  //       {
  //         revertMessage: acErrors.WMAC_HASNT_ROLE,
  //         from: regularAccounts[0],
  //       },
  //     )['fulfillRedemptionRequest(uint256)'](0);
  //   });

  //   it('should fail: when request with provided id does`nt exists', async () => {
  //     const {
  //       owner,
  //       redemptionVault,
  //       accessControl,
  //       regularAccounts,
  //       stableCoins,
  //       stUSD,
  //     } = await loadFixture(defaultDeploy);
  //     await fulfillRedemptionRequestTest(
  //       { redemptionVault, owner, stUSD },
  //       {
  //         revertMessage: 'RV: r not exists',
  //       },
  //     )['fulfillRedemptionRequest(uint256)'](0);
  //   });

  //   it('should fail: when contract has insufficient balance', async () => {
  //     const {
  //       owner,
  //       redemptionVault,
  //       accessControl,
  //       regularAccounts,
  //       stableCoins,
  //       stUSD,
  //     } = await loadFixture(defaultDeploy);
  //     const users = regularAccounts[0];
  //     await greenList(
  //       { accessControl, greenlistable: redemptionVault, owner },
  //       users,
  //     );
  //     await addPaymentTokenTest(
  //       { vault: redemptionVault, owner },
  //       stableCoins.dai,
  //     );
  //     await mintToken(stUSD, users.address, 1);

  //     await initiateRedemptionRequestTest(
  //       { redemptionVault, owner, stUSD },
  //       stableCoins.dai,
  //       1,
  //       { from: users },
  //     );

  //     await fulfillRedemptionRequestTest(
  //       { redemptionVault, owner, stUSD },
  //       {
  //         revertMessage: 'ERC20: transfer amount exceeds balance',
  //       },
  //     )['fulfillRedemptionRequest(uint256)'](0);
  //   });

  //   it('when request is exists and contract has sufficient balance', async () => {
  //     const {
  //       owner,
  //       redemptionVault,
  //       accessControl,
  //       regularAccounts,
  //       stableCoins,
  //       stUSD,
  //     } = await loadFixture(defaultDeploy);
  //     const users = regularAccounts[0];
  //     await greenList(
  //       { accessControl, greenlistable: redemptionVault, owner },
  //       users,
  //     );
  //     await addPaymentTokenTest(
  //       { vault: redemptionVault, owner },
  //       stableCoins.dai,
  //     );
  //     await mintToken(stUSD, users.address, 1);
  //     await mintToken(stableCoins.dai, redemptionVault.address, 100);

  //     await initiateRedemptionRequestTest(
  //       { redemptionVault, owner, stUSD },
  //       stableCoins.dai,
  //       1,
  //       { from: users },
  //     );

  //     await fulfillRedemptionRequestTest({ redemptionVault, owner, stUSD })[
  //       'fulfillRedemptionRequest(uint256)'
  //     ](0);
  //   });

  //   it('when request is exists and tokenOut is MANUAL_FULLFILMENT_TOKEN', async () => {
  //     const {
  //       owner,
  //       redemptionVault,
  //       accessControl,
  //       regularAccounts,
  //       stableCoins,
  //       stUSD,
  //       manualFulfillmentToken,
  //     } = await loadFixture(defaultDeploy);
  //     const users = regularAccounts[0];
  //     await greenList(
  //       { accessControl, greenlistable: redemptionVault, owner },
  //       users,
  //     );
  //     await addPaymentTokenTest(
  //       { vault: redemptionVault, owner },
  //       stableCoins.dai,
  //     );
  //     await mintToken(stUSD, users.address, 1);

  //     await initiateRedemptionRequestTest(
  //       { redemptionVault, owner, stUSD },
  //       manualFulfillmentToken,
  //       1,
  //       { from: users },
  //     );

  //     await fulfillRedemptionRequestTest({ redemptionVault, owner, stUSD })[
  //       'fulfillRedemptionRequest(uint256)'
  //     ](0);
  //   });
  // });

  describe('fulfillRedemptionRequest(uint256,uint256)', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);

      await fulfillRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        {
          revertMessage: acErrors.WMAC_HASNT_ROLE,
          from: regularAccounts[0],
        },
      )['fulfillRedemptionRequest(uint256,uint256)'](1, 0);
    });

    it('should fail: when request with provided id does`nt exists', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await fulfillRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
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
        stUSD,
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
      await mintToken(stUSD, users.address, 1);

      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        stableCoins.dai,
        1,
        { from: users },
      );

      await fulfillRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
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
        stUSD,
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
      await mintToken(stUSD, users.address, 1);
      await mintToken(stableCoins.dai, redemptionVault.address, 100);

      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        stableCoins.dai,
        1,
        { from: users },
      );

      await fulfillRedemptionRequestTest({ redemptionVault, owner, stUSD })[
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
        stUSD,
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
      await mintToken(stUSD, users.address, 1);

      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        manualFulfillmentToken,
        1,
        { from: users },
      );

      await fulfillRedemptionRequestTest({ redemptionVault, owner, stUSD })[
        'fulfillRedemptionRequest(uint256,uint256)'
      ](1, 1);
    });
  });

  describe('cancelRedemptionRequest()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);

      await cancelRedemptionRequestTest({ redemptionVault, owner, stUSD }, 0, {
        revertMessage: acErrors.WMAC_HASNT_ROLE,
        from: regularAccounts[0],
      });
    });

    it('should fail: when request with provided id does`nt exists', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await cancelRedemptionRequestTest({ redemptionVault, owner, stUSD }, 0, {
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
        stUSD,
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
      await mintToken(stUSD, users.address, 1);

      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        stableCoins.dai,
        1,
        { from: users },
      );

      await cancelRedemptionRequestTest({ redemptionVault, owner, stUSD }, 1);
    });

    it('when request id is valid and request tokenOut is MANUAL_FULLFILMENT_TOKEN', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        manualFulfillmentToken,
        stUSD,
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
      await mintToken(stUSD, users.address, 1);

      await initiateRedemptionRequestTest(
        { redemptionVault, owner, stUSD },
        manualFulfillmentToken,
        1,
        { from: users },
      );

      await cancelRedemptionRequestTest({ redemptionVault, owner, stUSD }, 1);
    });
  });

  describe('manuallyRedeem(address,address,uint256)', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);

      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
        {
          revertMessage: acErrors.WMAC_HASNT_ROLE,
          from: regularAccounts[0],
        },
      )['manuallyRedeem(address,address,uint256)'](
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
      );
    });

    it('should fail: when token out is not exists', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
        {
          revertMessage: 'MV: token not exists',
        },
      )['manuallyRedeem(address,address,uint256)'](
        regularAccounts[0],
        stableCoins.dai,
        1,
      );
    });

    it('should fail: when amount is 0', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
        {
          revertMessage: 'RV: 0 amount',
        },
      )['manuallyRedeem(address,address,uint256)'](
        ethers.constants.AddressZero,
        stableCoins.dai,
        0,
      );
    });

    it('should fail: when user is address(0)', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
        {
          revertMessage: 'RV: invalid user',
        },
      )['manuallyRedeem(address,address,uint256)'](
        ethers.constants.AddressZero,
        stableCoins.dai,
        1,
      );
    });

    it('should fail: when user`s stUSD balance is insufficient', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
        {
          revertMessage: 'ERC20: burn amount exceeds balance',
        },
      )['manuallyRedeem(address,address,uint256)'](
        regularAccounts[0],
        stableCoins.dai,
        1,
      );
    });

    it('should fail: when contract`s token balance is insufficient', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await mintToken(stUSD, regularAccounts[0], 1);

      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
        {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      )['manuallyRedeem(address,address,uint256)'](
        regularAccounts[0],
        stableCoins.dai,
        1,
      );
    });

    it('when contracts has sufficient balance', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await mintToken(stUSD, regularAccounts[0], 1);
      await mintToken(stableCoins.dai, redemptionVault, 100);

      await manualRedeemTest({ redemptionVault, owner, stUSD })[
        'manuallyRedeem(address,address,uint256)'
      ](regularAccounts[0], stableCoins.dai, 1);
    });
  });

  describe('manuallyRedeem(address,address,uint256,uint256)', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);

      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
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
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
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
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
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
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
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

    it('should fail: when user`s stUSD balance is insufficient', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
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

    it('should fail: when contract`s token balance is insufficient', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await manualRedeemTest(
        { redemptionVault, owner, stUSD },
        {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      )['manuallyRedeem(address,address,uint256,uint256)'](
        regularAccounts[0],
        stableCoins.dai,
        0,
        1,
      );
    });

    it('when contracts has sufficient balance', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await mintToken(stUSD, regularAccounts[0], 1);
      await mintToken(stableCoins.dai, redemptionVault, 1);

      await manualRedeemTest({ redemptionVault, owner, stUSD })[
        'manuallyRedeem(address,address,uint256,uint256)'
      ](regularAccounts[0], stableCoins.dai, 1, 1);
    });

    it('when amountStUsdIn is 0 and amountUsdOut is not 0', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await mintToken(stableCoins.dai, redemptionVault, 1);

      await manualRedeemTest({ redemptionVault, owner, stUSD })[
        'manuallyRedeem(address,address,uint256,uint256)'
      ](regularAccounts[0], stableCoins.dai, 0, 1);
    });

    it('when amountStUsdIn is not 0 and amountUsdOut is 0', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await mintToken(stUSD, regularAccounts[0], 1);

      await manualRedeemTest({ redemptionVault, owner, stUSD })[
        'manuallyRedeem(address,address,uint256,uint256)'
      ](regularAccounts[0], stableCoins.dai, 1, 0);
    });
  });
});
