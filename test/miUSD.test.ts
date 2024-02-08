import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { blackList, acErrors, unBlackList } from './common/ac.helpers';
import { defaultDeploy } from './common/fixtures';
import { mint as mintMTBILL } from './common/mTBILL.helpers';
import { burn, mint } from './common/miUSD.helpers';
import { approveBase18 } from './common/common.helpers';
import { setRoundData } from './common/data-feed.helpers';
import { constants } from 'ethers';

describe('miUSD', function () {
  it('deployment', async () => {
    const { miUSD, dataFeed, ac, mTBILL } = await loadFixture(defaultDeploy);

    expect(await miUSD.name()).eq('miUSD');
    expect(await miUSD.symbol()).eq('miUSD');
    expect(await miUSD.decimals()).eq(18);
    expect(await miUSD.totalShares()).eq(0);
    expect(await miUSD.DIVIDER()).eq(parseUnits('1', 18));

    expect(await miUSD.underlyingToken()).eq(mTBILL.address);
    expect(await miUSD.priceFeed()).eq(dataFeed.address);
    expect(await miUSD.accessControl()).eq(ac.address);

    expect(await miUSD.paused()).eq(false);
  });

  it('initialize', async () => {
    const { miUSD } = await loadFixture(defaultDeploy);

    await expect(
      miUSD.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('Initializable: contract is already initialized');

    await expect(
      miUSD.initializeWithoutInitializer(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('Initializable: contract is not initializing');
  });

  describe('pause()', () => {
    it('should fail: call from address without MI_USD_ADMIN_ROLE role', async () => {
      const { miUSD, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await expect(miUSD.connect(caller).pause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, miUSD } = await loadFixture(defaultDeploy);

      await miUSD.connect(owner).pause();
      await expect(miUSD.connect(owner).pause()).revertedWith(
        `Pausable: paused`,
      );
    });

    it('call when unpaused', async () => {
      const { owner, miUSD } = await loadFixture(defaultDeploy);
      expect(await miUSD.paused()).eq(false);
      await expect(miUSD.connect(owner).pause()).to.emit(
        miUSD,
        miUSD.interface.events['Paused(address)'].name,
      ).to.not.reverted;
      expect(await miUSD.paused()).eq(true);
    });
  });

  describe('unpause()', () => {
    it('should fail: call from address without MI_USD_ADMIN_ROLE role', async () => {
      const { owner, miUSD, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await miUSD.connect(owner).pause();
      await expect(miUSD.connect(caller).unpause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, miUSD } = await loadFixture(defaultDeploy);

      await expect(miUSD.connect(owner).unpause()).revertedWith(
        `Pausable: not paused`,
      );
    });

    it('call when paused', async () => {
      const { owner, miUSD } = await loadFixture(defaultDeploy);
      expect(await miUSD.paused()).eq(false);
      await miUSD.connect(owner).pause();
      expect(await miUSD.paused()).eq(true);

      await expect(miUSD.connect(owner).unpause()).to.emit(
        miUSD,
        miUSD.interface.events['Unpaused(address)'].name,
      ).to.not.reverted;

      expect(await miUSD.paused()).eq(false);
    });
  });

  describe('balanceOf()', () => {
    it('when price is 100 and sharesOf is 1', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const shares = parseUnits('1');
      await setRoundData({ mockedAggregator }, 100);
      await miUSD.mintTest(owner.address, shares);
      expect(await miUSD.balanceOf(owner.address)).eq(parseUnits('100'));
      expect(await miUSD.sharesOf(owner.address)).eq(parseUnits('1'));
      expect(await miUSD.totalShares()).eq(parseUnits('1'));
      expect(await miUSD.totalSupply()).eq(parseUnits('100'));
    });

    it('when price is 100 and sharesOf is 1 and then price goes to 200', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const shares = parseUnits('1');
      await setRoundData({ mockedAggregator }, 100);
      await miUSD.mintTest(owner.address, shares);

      expect(await miUSD.balanceOf(owner.address)).eq(parseUnits('100'));

      await setRoundData({ mockedAggregator }, 200);

      expect(await miUSD.balanceOf(owner.address)).eq(parseUnits('200'));
      expect(await miUSD.totalSupply()).eq(parseUnits('200'));
    });
  });

  describe('transfer(),transferFrom()', () => {
    it('should fail: when transfer exceeds balance', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);

      await expect(
        miUSD.transfer(regularAccounts[0].address, parseUnits('50')),
      ).revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('should fail: transferFrom() when transfer exceeds allowance', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);

      await expect(
        miUSD.transferFrom(
          regularAccounts[0].address,
          owner.address,
          parseUnits('50'),
        ),
      ).revertedWith('ERC20: insufficient allowance');
    });

    it('should fail: transfer() when from is address(0)', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);

      await expect(
        miUSD.transferTest(constants.AddressZero, owner.address, 1),
      ).revertedWith('ERC20: transfer from the zero address');
    });

    it('transferFrom() when allowance is uint.max', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);
      await miUSD.mintTest(owner.address, 1);

      await miUSD
        .connect(regularAccounts[0])
        .approve(owner.address, constants.MaxUint256);

      await expect(
        miUSD.transferFrom(regularAccounts[0].address, owner.address, 1),
      ).not.reverted;

      expect(
        (await miUSD.allowance(regularAccounts[0].address, owner.address)).eq(
          constants.MaxUint256,
        ),
      );
    });

    it('transferFrom() when allowance is set to transfer amount', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);
      await miUSD.mintTest(owner.address, 1);

      await miUSD.connect(regularAccounts[0]).approve(owner.address, 1);

      await expect(
        miUSD.transferFrom(regularAccounts[0].address, owner.address, 1),
      ).not.reverted;

      expect(
        (await miUSD.allowance(regularAccounts[0].address, owner.address)).eq(
          0,
        ),
      );
    });

    it('should fail: when transfer to address(0)', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);

      await expect(
        miUSD.transfer(constants.AddressZero, parseUnits('50')),
      ).revertedWith('ERC20: transfer to the zero address');
    });

    it('when balance is 100, transfer 50 when price per share is 100', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      const shares = parseUnits('1');
      await setRoundData({ mockedAggregator }, 100);
      await miUSD.mintTest(owner.address, shares);

      await miUSD.transfer(regularAccounts[0].address, parseUnits('50'));
      expect(await miUSD.balanceOf(owner.address)).eq(parseUnits('50'));
      expect(await miUSD.balanceOf(regularAccounts[0].address)).eq(
        parseUnits('50'),
      );

      expect(await miUSD.sharesOf(owner.address)).eq(parseUnits('0.5'));
      expect(await miUSD.sharesOf(regularAccounts[0].address)).eq(
        parseUnits('0.5'),
      );
    });
  });

  describe('approve(),allowance(),increaseAllowance(),decreaseAllowance()', () => {
    it('should fail: approve() when from is address(0)', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);

      await expect(
        miUSD.approveTest(constants.AddressZero, owner.address, 1),
      ).revertedWith('ERC20: approve from the zero address');
    });
    it('should fail: when approve to address(0)', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);

      await expect(
        miUSD.approve(constants.AddressZero, parseUnits('50')),
      ).revertedWith('ERC20: approve to the zero address');
    });

    it('should fail: decreaseAllowance() when decrease amount is > current allowance', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 100);

      await miUSD.approve(regularAccounts[0].address, parseUnits('50'));

      await expect(
        miUSD.decreaseAllowance(regularAccounts[0].address, parseUnits('51')),
      ).revertedWith('ERC20: decreased allowance below zero');
    });

    it('approve for 100 tokens then price is changed', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      const shares = parseUnits('1');
      await setRoundData({ mockedAggregator }, 100);

      await miUSD.approve(regularAccounts[0].address, parseUnits('100'));

      expect(
        await miUSD.allowance(owner.address, regularAccounts[0].address),
      ).eq(parseUnits('100'));

      await setRoundData({ mockedAggregator }, 150);

      expect(
        await miUSD.allowance(owner.address, regularAccounts[0].address),
      ).eq(parseUnits('100'));
    });

    it('approve for 100 tokens, increaseAllowance by 50 then price is changed', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      const shares = parseUnits('1');
      await setRoundData({ mockedAggregator }, 100);

      await miUSD.approve(regularAccounts[0].address, parseUnits('100'));

      expect(
        await miUSD.allowance(owner.address, regularAccounts[0].address),
      ).eq(parseUnits('100'));

      await miUSD.increaseAllowance(
        regularAccounts[0].address,
        parseUnits('50'),
      );

      await setRoundData({ mockedAggregator }, 150);

      expect(
        await miUSD.allowance(owner.address, regularAccounts[0].address),
      ).eq(parseUnits('150'));
    });

    it('approve for 100 tokens, decreaseAllowance by 50 then price is changed', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      const shares = parseUnits('1');
      await setRoundData({ mockedAggregator }, 100);

      await miUSD.approve(regularAccounts[0].address, parseUnits('100'));

      expect(
        await miUSD.allowance(owner.address, regularAccounts[0].address),
      ).eq(parseUnits('100'));

      await miUSD.decreaseAllowance(
        regularAccounts[0].address,
        parseUnits('50'),
      );

      await setRoundData({ mockedAggregator }, 150);

      expect(
        await miUSD.allowance(owner.address, regularAccounts[0].address),
      ).eq(parseUnits('50'));
    });
  });

  describe('mint()', () => {
    it('should fail: call when mTBILL allowance is insufficient', async () => {
      const { owner, miUSD, mTBILL } = await loadFixture(defaultDeploy);
      await mint({ owner, miUSD, mTBILL }, owner, 11, {
        revertMessage: 'ERC20: insufficient allowance',
      });
    });

    it('should fail: call when mTBILL user balance is insufficient', async () => {
      const { owner, miUSD, mTBILL } = await loadFixture(defaultDeploy);
      await approveBase18(owner, mTBILL, miUSD, 10);
      await mint({ owner, miUSD, mTBILL }, owner, 10, {
        revertMessage: 'ERC20: transfer amount exceeds balance',
      });
    });

    it('should fail: when amount shares is 0', async () => {
      const { owner, miUSD, mTBILL } = await loadFixture(defaultDeploy);
      await mint({ owner, miUSD, mTBILL }, owner, 0, {
        revertMessage: 'RERC20: amount is 0',
      });
    });

    it('exchange 1 mTBILL for miUSD when price is 108', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      await mintMTBILL({ mTBILL, owner }, owner, parseUnits('1'));
      await approveBase18(owner, mTBILL, miUSD, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, miUSD, mTBILL }, owner, parseUnits('1'));
    });

    it('exchange smallest friction of mTBILL for miUSD when price is 108', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      await mintMTBILL({ mTBILL, owner }, owner, 1);
      await approveBase18(owner, mTBILL, miUSD, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, miUSD, mTBILL }, owner, 1);
    });

    it('exchange 1 mTBILL for miUSD when price is 108, then check balance when price is 110', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      await mintMTBILL({ mTBILL, owner }, owner, parseUnits('1'));
      await approveBase18(owner, mTBILL, miUSD, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, miUSD, mTBILL }, owner, parseUnits('1'));
      await setRoundData({ mockedAggregator }, 110);
      expect(await miUSD.balanceOf(owner.address)).eq(parseUnits('110'));
    });
  });

  describe('burn()', () => {
    it('should fail: call when miUSD user balance is insufficient', async () => {
      const { owner, miUSD, mTBILL } = await loadFixture(defaultDeploy);
      await burn({ owner, miUSD, mTBILL }, 10, {
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('should fail: when amount tokens is 0', async () => {
      const { owner, miUSD, mTBILL } = await loadFixture(defaultDeploy);
      await burn({ owner, miUSD, mTBILL }, 0, {
        revertMessage: 'RERC20: amount is 0',
      });
    });

    it('burn 108 miUSD for miUSD when price is 108', async () => {
      const { owner, miUSD, mTBILL, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      await mintMTBILL({ mTBILL, owner }, owner, parseUnits('1'));
      await approveBase18(owner, mTBILL, miUSD, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, miUSD, mTBILL }, owner, parseUnits('1'));

      await burn({ owner, miUSD, mTBILL }, 108);
    });
  });

  describe('_beforeTokenTransfer()', () => {
    it('should fail: transfer(...) when contract is paused', async () => {
      const { owner, mTBILL, miUSD, mockedAggregator, regularAccounts } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mintMTBILL({ mTBILL, owner }, owner, parseUnits('1'));
      await approveBase18(owner, mTBILL, miUSD, 1);
      await setRoundData({ mockedAggregator }, 108);
      await mint({ owner, miUSD, mTBILL }, owner, parseUnits('1'));

      await miUSD.connect(owner).pause();

      await expect(miUSD.transfer(to.address, 1)).revertedWith(
        'ERC20Pausable: token transfer while paused',
      );
    });
  });
});
