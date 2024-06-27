import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { acErrors, greenList } from './common/ac.helpers';
import { approveBase18, mintToken, pauseVault } from './common/common.helpers';

import { defaultDeploy } from './common/fixtures';

import { redeem } from './common/redemption-vault.helpers';
import { constants } from 'ethers';

describe.only('EUsdRedemptionVault', function () {
  it('deployment', async () => {
    const { eUSdRedemptionVault, eUSD, tokensReceiver } = await loadFixture(
      defaultDeploy,
    );

    expect(await eUSdRedemptionVault.mTBILL()).eq(eUSD.address);

    expect(await eUSdRedemptionVault.paused()).eq(false);

    expect(await eUSdRedemptionVault.tokensReceiver()).eq(
      tokensReceiver.address,
    );

    expect(await eUSdRedemptionVault.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await eUSdRedemptionVault.vaultRole()).eq(
      await eUSdRedemptionVault.E_USD_REDEMPTION_VAULT_ADMIN_ROLE(),
    );

    expect(await eUSdRedemptionVault.greenlistedRole()).eq(
      await eUSdRedemptionVault.E_USD_GREENLISTED_ROLE(),
    );

    expect(await eUSdRedemptionVault.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
  });

  describe('roles', () => {
    it('greenlist access', async () => {
      const {
        eUSdRedemptionVault: redemptionVault,
        regularAccounts,
        eUsdOwner: owner,
        owner: otherOwner,
        eUSD: mTBILL,
        stableCoins,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await redeem({ redemptionVault, owner, mTBILL }, stableCoins.dai, 0, {
        revertMessage: acErrors.WMAC_HASNT_ROLE,
        from: regularAccounts[0],
      });

      await greenList(
        {
          accessControl,
          greenlistable: redemptionVault,
          owner,
          role: await redemptionVault.E_USD_GREENLISTED_ROLE(),
        },
        regularAccounts[0],
      );
      await mintToken(mTBILL, regularAccounts[0], 1);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 1);

      await redeem(
        { redemptionVault, owner, mTBILL },
        constants.AddressZero,
        1,
        {
          from: regularAccounts[0],
        },
      );
    });
    it('vault admin access', async () => {
      const {
        eUSdRedemptionVault: redemptionVault,
        regularAccounts,
        eUsdOwner: owner,
        owner: otherOwner,
        eUSD: mTBILL,
        stableCoins,
        accessControl,
      } = await loadFixture(defaultDeploy);

      console.log(
        'have role',
        await accessControl.hasRole(
          await redemptionVault.E_USD_REDEMPTION_VAULT_ADMIN_ROLE(),
          owner.address,
        ),
      );

      await pauseVault(redemptionVault, {
        from: otherOwner,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });

      await pauseVault(redemptionVault, {
        from: owner,
      });
    });
  });
});
