import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { blackList, acErrors, unBlackList } from './common/ac.helpers';
import { defaultDeploy } from './common/fixtures';
import { mint as mintMTBILL } from './common/mTBILL.helpers';
import { burn, mint } from './common/stUSDr.helpers';
import { approveBase18 } from './common/common.helpers';
import { setRoundData } from './common/data-feed.helpers';

describe.only('stUSDr', function () {
  it('deployment', async () => {
    const { stUSDr, dataFeed, ac, mTBILL } = await loadFixture(defaultDeploy);

    expect(await stUSDr.name()).eq('stUSDr');
    expect(await stUSDr.symbol()).eq('stUSDr');
    expect(await stUSDr.decimals()).eq(18);
    expect(await stUSDr.totalShares()).eq(0);
    expect(await stUSDr.DIVIDER()).eq(parseUnits('1', 18));

    expect(await stUSDr.underlyingToken()).eq(mTBILL.address);
    expect(await stUSDr.priceFeed()).eq(dataFeed.address);
    expect(await stUSDr.accessControl()).eq(ac.address);

    expect(await stUSDr.paused()).eq(false);
  });

  it('initialize', async () => {
    const { stUSDr } = await loadFixture(defaultDeploy);

    await expect(
      stUSDr.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('Initializable: contract is already initialized');
  });

  describe('pause()', () => {
    it('should fail: call from address without ST_USDR_ADMIN_ROLE role', async () => {
      const { stUSDr, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await expect(stUSDr.connect(caller).pause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, stUSDr } = await loadFixture(defaultDeploy);

      await stUSDr.connect(owner).pause();
      await expect(stUSDr.connect(owner).pause()).revertedWith(
        `Pausable: paused`,
      );
    });

    it('call when unpaused', async () => {
      const { owner, stUSDr } = await loadFixture(defaultDeploy);
      expect(await stUSDr.paused()).eq(false);
      await expect(stUSDr.connect(owner).pause()).to.emit(
        stUSDr,
        stUSDr.interface.events['Paused(address)'].name,
      ).to.not.reverted;
      expect(await stUSDr.paused()).eq(true);
    });
  });

  describe('unpause()', () => {
    it('should fail: call from address without ST_USDR_ADMIN_ROLE role', async () => {
      const { owner, stUSDr, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await stUSDr.connect(owner).pause();
      await expect(stUSDr.connect(caller).unpause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, stUSDr } = await loadFixture(defaultDeploy);

      await expect(stUSDr.connect(owner).unpause()).revertedWith(
        `Pausable: not paused`,
      );
    });

    it('call when paused', async () => {
      const { owner, stUSDr } = await loadFixture(defaultDeploy);
      expect(await stUSDr.paused()).eq(false);
      await stUSDr.connect(owner).pause();
      expect(await stUSDr.paused()).eq(true);

      await expect(stUSDr.connect(owner).unpause()).to.emit(
        stUSDr,
        stUSDr.interface.events['Unpaused(address)'].name,
      ).to.not.reverted;

      expect(await stUSDr.paused()).eq(false);
    });
  });

  describe('mint()', () => {
    it('should fail: call when mTBILL allowance is insufficient', async () => {
      const { owner, stUSDr, mTBILL } = await loadFixture(defaultDeploy);
      await mint({ owner, stUSDr, mTBILL }, 11, {
        revertMessage: 'ERC20: insufficient allowance',
      });
    });

    it('should fail: call when mTBILL user balance is insufficient', async () => {
      const { owner, stUSDr, mTBILL } = await loadFixture(defaultDeploy);
      await approveBase18(owner, mTBILL, stUSDr, 10);
      await mint({ owner, stUSDr, mTBILL }, 10, {
        revertMessage: 'ERC20: transfer amount exceeds balance',
      });
    });

    it('should fail: when amount shares is 0', async () => {
      const { owner, stUSDr, mTBILL } = await loadFixture(defaultDeploy);
      await mint({ owner, stUSDr, mTBILL }, 0, {
        revertMessage: 'RERC20: amount is 0',
      });
    });

    it('exchange 1 mTBILL for stUSDr when price is 108', async () => {
      const { owner, stUSDr, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      await mintMTBILL({ mTBILL, owner }, owner, parseUnits('1'));
      await approveBase18(owner, mTBILL, stUSDr, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, stUSDr, mTBILL }, parseUnits('1'));
    });

    it('exchange smallest friction of mTBILL for stUSDr when price is 108', async () => {
      const { owner, stUSDr, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      await mintMTBILL({ mTBILL, owner }, owner, 1);
      await approveBase18(owner, mTBILL, stUSDr, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, stUSDr, mTBILL }, 1);
    });

    it('exchange 1 mTBILL for stUSDr when price is 108, then check balance when price is 110', async () => {
      const { owner, stUSDr, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      await mintMTBILL({ mTBILL, owner }, owner, parseUnits('1'));
      await approveBase18(owner, mTBILL, stUSDr, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, stUSDr, mTBILL }, parseUnits('1'));
      await setRoundData({ mockedAggregator }, 110);
      expect(await stUSDr.balanceOf(owner.address)).eq(parseUnits('110'));
    });
  });

  describe('burn()', () => {
    it('should fail: call when stUSDr user balance is insufficient', async () => {
      const { owner, stUSDr, mTBILL } = await loadFixture(defaultDeploy);
      await burn({ owner, stUSDr, mTBILL }, 10, {
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('should fail: when amount tokens is 0', async () => {
      const { owner, stUSDr, mTBILL } = await loadFixture(defaultDeploy);
      await burn({ owner, stUSDr, mTBILL }, 0, {
        revertMessage: 'RERC20: amount is 0',
      });
    });

    it('burn 108 stUSDr for stUSDr when price is 108', async () => {
      const { owner, stUSDr, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      await mintMTBILL({ mTBILL, owner }, owner, parseUnits('1'));
      await approveBase18(owner, mTBILL, stUSDr, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, stUSDr, mTBILL }, parseUnits('1'));

      await burn({ owner, stUSDr, mTBILL }, 108);
    });
  });

  describe('_beforeTokenTransfer()', () => {
    it('should fail: transfer(...) when contract is paused', async () => {
      const { owner, mTBILL, stUSDr, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mintMTBILL({ mTBILL, owner }, owner, parseUnits('1'));
      await approveBase18(owner, mTBILL, stUSDr, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, stUSDr, mTBILL }, parseUnits('1'));

      await stUSDr.connect(owner).pause();

      await expect(stUSDr.transfer(to.address, 1)).revertedWith(
        'ERC20Pausable: token transfer while paused',
      );
    });
  });
});
