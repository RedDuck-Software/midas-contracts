import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { assert, expect } from 'chai';
import { ethers } from 'hardhat';
import { defaultDeploy } from './common/fixtures';

describe('MidasAccessControl', function () {
  it('Deployment', async () => {
    const { accessControl, roles, owner } = await loadFixture(defaultDeploy)

    const { blacklisted: _, whitelisted: __, ...rolesToCheck } = roles;

    for (const role of Object.values(rolesToCheck)) {
      expect(await accessControl.hasRole(role, owner.address)).to.eq(true);
    }

    expect(await accessControl.getRoleAdmin(roles.blacklisted)).eq(roles.blacklistedOperator);
  });
});

describe('WithMidasAccessControl', function () {
  it('Deployment', async () => {
    const { accessControl, wAccessControlTester } = await loadFixture(defaultDeploy)
    expect(await wAccessControlTester.accessControl()).eq(accessControl.address);
  });

  describe('grantRole()', () => {
    describe('should fail', () => {
      it('call from non DEFAULT_ADMIN_ROLE address', async () => {
        const { wAccessControlTester, regularAccounts, roles } = await loadFixture(defaultDeploy)
        await expect(wAccessControlTester.connect(regularAccounts[1]).grantRole(roles.blacklisted, regularAccounts[0].address))
          .revertedWith(
            'WMAC: hasnt role'
          );
      })
    })
  });
});