import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { blackList, acErrors, unBlackList } from './common/ac.helpers';
import { defaultDeploy } from './common/fixtures';
import { burn, mint, setMetadataTest } from './common/stUSD.helpers';

describe('stUSD', function () {
  it('deployment', async () => {
    const { accessControl, roles, stUSD } = await loadFixture(defaultDeploy);

    expect(await stUSD.name()).eq('stUSD');
    expect(await stUSD.symbol()).eq('stUSD');

    expect(await stUSD.paused()).eq(false);

    expect(
      await accessControl.hasRole(roles.blacklistedOperator, stUSD.address),
    ).eq(true);
  });

  it('initialize', async () => {
    const { stUSD } = await loadFixture(defaultDeploy);

    await expect(stUSD.initialize(ethers.constants.AddressZero)).revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  describe('pause()', () => {
    it('should fail: call from address without ST_USD_PAUSE_OPERATOR_ROLE role', async () => {
      const { stUSD, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await expect(stUSD.connect(caller).pause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, stUSD } = await loadFixture(defaultDeploy);

      await stUSD.connect(owner).pause();
      await expect(stUSD.connect(owner).pause()).revertedWith(
        `Pausable: paused`,
      );
    });

    it('call when unpaused', async () => {
      const { owner, stUSD } = await loadFixture(defaultDeploy);
      expect(await stUSD.paused()).eq(false);
      await expect(stUSD.connect(owner).pause()).to.emit(
        stUSD,
        stUSD.interface.events['Paused(address)'].name,
      ).to.not.reverted;
      expect(await stUSD.paused()).eq(true);
    });
  });

  describe('unpause()', () => {
    it('should fail: call from address without ST_USD_PAUSE_OPERATOR_ROLE role', async () => {
      const { owner, stUSD, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await stUSD.connect(owner).pause();
      await expect(stUSD.connect(caller).unpause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, stUSD } = await loadFixture(defaultDeploy);

      await expect(stUSD.connect(owner).unpause()).revertedWith(
        `Pausable: not paused`,
      );
    });

    it('call when paused', async () => {
      const { owner, stUSD } = await loadFixture(defaultDeploy);
      expect(await stUSD.paused()).eq(false);
      await stUSD.connect(owner).pause();
      expect(await stUSD.paused()).eq(true);

      await expect(stUSD.connect(owner).unpause()).to.emit(
        stUSD,
        stUSD.interface.events['Unpaused(address)'].name,
      ).to.not.reverted;

      expect(await stUSD.paused()).eq(false);
    });
  });

  describe('mint()', () => {
    it('should fail: call from address without ST_USD_MINT_OPERATOR_ROLE role', async () => {
      const { owner, stUSD, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await mint({ stUSD, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with ST_USD_MINT_OPERATOR_ROLE role', async () => {
      const { owner, stUSD, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ stUSD, owner }, to, amount);
    });
  });

  describe('burn()', () => {
    it('should fail: call from address without ST_USD_BURN_OPERATOR_ROLE role', async () => {
      const { owner, stUSD, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await burn({ stUSD, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: call when user has insufficient balance', async () => {
      const { owner, stUSD, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await burn({ stUSD, owner }, to, amount, {
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('call from address with ST_USD_MINT_OPERATOR_ROLE role', async () => {
      const { owner, stUSD, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ stUSD, owner }, to, amount);
      await burn({ stUSD, owner }, to, amount);
    });
  });

  describe('setMetadata()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, stUSD, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];
      await setMetadataTest({ stUSD, owner }, 'url', 'some value', {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, stUSD } = await loadFixture(defaultDeploy);
      await setMetadataTest({ stUSD, owner }, 'url', 'some value', undefined);
    });
  });

  describe('_beforeTokenTransfer()', () => {
    it('should fail: mint(...) when address is blacklisted', async () => {
      const { owner, stUSD, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];

      await blackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );
      await mint({ stUSD, owner }, blacklisted, 1, {
        revertMessage: acErrors.WMAC_HAS_ROLE,
      });
    });

    it('should fail: burn(...) when address is blacklisted', async () => {
      const { owner, stUSD, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];

      await mint({ stUSD, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );
      await burn({ stUSD, owner }, blacklisted, 1, {
        revertMessage: acErrors.WMAC_HAS_ROLE,
      });
    });

    it('should fail: transfer(...) when from address is blacklisted', async () => {
      const { owner, stUSD, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ stUSD, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );

      await expect(
        stUSD.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transfer(...) when to address is blacklisted', async () => {
      const { owner, stUSD, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];

      await mint({ stUSD, owner }, from, 1);
      await blackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );

      await expect(
        stUSD.connect(from).transfer(blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when from address is blacklisted', async () => {
      const { owner, stUSD, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ stUSD, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );

      await stUSD.connect(blacklisted).approve(to.address, 1);

      await expect(
        stUSD.connect(to).transferFrom(blacklisted.address, to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when to address is blacklisted', async () => {
      const { owner, stUSD, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const caller = regularAccounts[2];

      await mint({ stUSD, owner }, from, 1);

      await blackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );
      await stUSD.connect(from).approve(caller.address, 1);

      await expect(
        stUSD
          .connect(caller)
          .transferFrom(from.address, blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('transferFrom(...) when caller address is blacklisted', async () => {
      const { owner, stUSD, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const to = regularAccounts[2];

      await mint({ stUSD, owner }, from, 1);
      await blackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );

      await stUSD.connect(from).approve(blacklisted.address, 1);

      await expect(
        stUSD.connect(blacklisted).transferFrom(from.address, to.address, 1),
      ).not.reverted;
    });

    it('transfer(...) when caller address was blacklisted and then un-blacklisted', async () => {
      const { owner, stUSD, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const to = regularAccounts[2];

      await mint({ stUSD, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );

      await expect(
        stUSD.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);

      await unBlackList(
        { blacklistable: stUSD, accessControl, owner },
        blacklisted,
      );

      await expect(stUSD.connect(blacklisted).transfer(to.address, 1)).not
        .reverted;
    });
  });
});
