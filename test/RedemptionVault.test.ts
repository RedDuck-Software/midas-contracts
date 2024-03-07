import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { acErrors, greenList } from './common/ac.helpers';
import { approveBase18, mintToken, pauseVault } from './common/common.helpers';
import { defaultDeploy } from './common/fixtures';
import { addPaymentTokenTest } from './common/manageable-vault.helpers';
import { redeem } from './common/redemption-vault.helpers';

describe('RedemptionVault', function () {
  it('deployment', async () => {
    const { redemptionVault, stUSD, tokensReceiver, roles } = await loadFixture(
      defaultDeploy,
    );

    expect(await redemptionVault.stUSD()).eq(stUSD.address);

    expect(await redemptionVault.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await redemptionVault.paused()).eq(false);

    expect(await redemptionVault.tokensReceiver()).eq(tokensReceiver.address);

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
      ),
    ).revertedWith('Initializable: contract is already initialized');
  });

  describe('redeem()', () => {
    it('should fail: call from address without GREENLISTED_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);

      await redeem({ redemptionVault, owner, stUSD }, stableCoins.dai, 0, {
        revertMessage: acErrors.WMAC_HASNT_ROLE,
        from: regularAccounts[0],
      });
    });

    it('should fail: when 0 amount passed', async () => {
      const { owner, redemptionVault, accessControl, stableCoins, stUSD } =
        await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await redeem({ redemptionVault, owner, stUSD }, stableCoins.dai, 0, {
        revertMessage: 'RV: 0 amount',
      });
    });

    it('should fail: when stUSD allowance is insufficient', async () => {
      const { owner, redemptionVault, accessControl, stableCoins, stUSD } =
        await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );

      await redeem({ redemptionVault, owner, stUSD }, stableCoins.dai, 1, {
        revertMessage: 'ERC20: insufficient allowance',
      });
    });

    it('should fail: when is on pause', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        regularAccounts,
        manualFulfillmentToken,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await pauseVault(redemptionVault);
      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        regularAccounts[0],
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(stUSD, regularAccounts[0].address, 1);
      await approveBase18(owner, stUSD, redemptionVault, 1);

      await redeem(
        { redemptionVault, owner, stUSD },
        manualFulfillmentToken,
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('is on pause but admin can do everything', async () => {
      const { owner, redemptionVault, accessControl, stableCoins, stUSD } =
        await loadFixture(defaultDeploy);
      await pauseVault(redemptionVault);

      await greenList(
        { accessControl, greenlistable: redemptionVault, owner },
        owner,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await mintToken(stUSD, owner, 1);
      await approveBase18(owner, stUSD, redemptionVault, 1);
      await redeem({ redemptionVault, owner, stUSD }, stableCoins.dai, 1, {
        revertMessage: 'Pausable: paused',
      });
    });

    it('when token out is MANUAL_FULLFILMENT_TOKEN', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
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
      await approveBase18(owner, stUSD, redemptionVault, 1);
      await redeem(
        { redemptionVault, owner, stUSD },
        manualFulfillmentToken,
        1,
      );
    });
  });
});
