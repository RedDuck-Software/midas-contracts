import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { assert, expect } from 'chai';
import { ethers } from 'hardhat';
import { defaultDeploy } from './common/fixtures';
import { acErrors, blackList, unBlackList } from './common/ac.helpers';

describe.only('Blacklistable', function () {
  it('deployment', async () => {
    const { accessControl, blackListableTester, roles, owner } = await loadFixture(defaultDeploy)

    expect(await accessControl.hasRole(roles.blacklistedOperator, blackListableTester.address)).eq(true);
  });

  describe('modifier onlyNotBlacklisted', () => { 
    it('should fail: call from blacklisted user', async () => {
      const { accessControl, blackListableTester, roles, owner, regularAccounts } = await loadFixture(defaultDeploy)
      
      await blackList({ blacklistable: blackListableTester, accessControl, owner}, regularAccounts[0]);
      await expect(blackListableTester.onlyNotBlacklistedTester(regularAccounts[0].address))
        .revertedWith(acErrors.WMAC_HAS_ROLE)
    })

    it('call from not blacklisted user', async () => {
      const { accessControl, blackListableTester, roles, owner, regularAccounts } = await loadFixture(defaultDeploy)
      await expect(blackListableTester.onlyNotBlacklistedTester(regularAccounts[0].address))
        .not.reverted
    })
  })

  describe('addToBlackList', () => { 
    it('should fail: call from user without BLACKLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, blackListableTester, roles, owner, regularAccounts } = await loadFixture(defaultDeploy)

      await blackList({ blacklistable: blackListableTester, accessControl, owner}, regularAccounts[0], {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE
      });
    })

    it('call from user with BLACKLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, blackListableTester, roles, owner, regularAccounts } = await loadFixture(defaultDeploy)
      await blackList({ blacklistable: blackListableTester, accessControl, owner}, regularAccounts[0]);
    })
  })

  describe('removeFromBlackList', () => { 
    it('should fail: call from user without BLACKLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, blackListableTester, roles, owner, regularAccounts } = await loadFixture(defaultDeploy)

      await unBlackList({ blacklistable: blackListableTester, accessControl, owner}, regularAccounts[0], {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE
      });
    })

    it('call from user with BLACKLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, blackListableTester, roles, owner, regularAccounts } = await loadFixture(defaultDeploy)
      await unBlackList({ blacklistable: blackListableTester, accessControl, owner}, regularAccounts[0]);
    })
  })
});
