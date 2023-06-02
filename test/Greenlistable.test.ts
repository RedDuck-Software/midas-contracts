import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { assert, expect } from 'chai';
import { ethers } from 'hardhat';

import { acErrors, greenList, unGreenList } from './common/ac.helpers';
import { defaultDeploy } from './common/fixtures';

describe('Greenlistable', function () {
  it('deployment', async () => {
    const { accessControl, greenListableTester, roles, owner } =
      await loadFixture(defaultDeploy);

    expect(
      await accessControl.hasRole(
        roles.greenlistedOperator,
        greenListableTester.address,
      ),
    ).eq(true);
  });

  describe('modifier onlyGreenlisted', () => {
    it('should fail: call from greenlisted user', async () => {
      const {
        accessControl,
        greenListableTester,
        roles,
        owner,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await expect(
        greenListableTester.onlyGreenlistedTester(regularAccounts[0].address),
      ).revertedWith(acErrors.WMAC_HASNT_ROLE);
    });

    it('call from not greenlisted user', async () => {
      const {
        accessControl,
        greenListableTester,
        roles,
        owner,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );
      await expect(
        greenListableTester.onlyGreenlistedTester(regularAccounts[0].address),
      ).not.reverted;
    });
  });

  describe('addToGreenList', () => {
    it('should fail: call from user without GREENLIST_OPERATOR_ROLE role', async () => {
      const {
        accessControl,
        greenListableTester,
        roles,
        owner,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from user with GREENLIST_OPERATOR_ROLE role', async () => {
      const {
        accessControl,
        greenListableTester,
        roles,
        owner,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );
    });
  });

  describe('removeFromGreenList', () => {
    it('should fail: call from user without GREENLIST_OPERATOR_ROLE role', async () => {
      const {
        accessControl,
        greenListableTester,
        roles,
        owner,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await unGreenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from user with GREENLIST_OPERATOR_ROLE role', async () => {
      const {
        accessControl,
        greenListableTester,
        roles,
        owner,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await unGreenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );
    });
  });
});
