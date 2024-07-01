import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { acErrors } from './common/ac.helpers';
import { setRoundData, setRoundDataSafe } from './common/custom-feed.helpers';
import { defaultDeploy } from './common/fixtures';

import {
  // eslint-disable-next-line camelcase
  ManageableVaultTester__factory,
} from '../typechain-types';

describe.only('CustomAggregatorV3CompatibleFeed', function () {
  it('deployment', async () => {
    const { customFeed } = await loadFixture(defaultDeploy);

    expect(await customFeed.maxAnswer()).eq(parseUnits('10000', 8));
    expect(await customFeed.minAnswer()).eq(2);
    expect(await customFeed.maxAnswerDeviation()).eq(parseUnits('1', 8));
    expect(await customFeed.description()).eq('Custom Data Feed');
    expect(await customFeed.decimals()).eq(8);
    expect(await customFeed.version()).eq(1);
    expect(await customFeed.latestRound()).eq(0);
    expect(await customFeed.lastAnswer()).eq(0);
    expect(await customFeed.lastTimestamp()).eq(0);
    expect(await customFeed.feedAdminRole()).eq(
      await customFeed.CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });

  describe('setRoundData', async () => {
    it('call from owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundData(fixture, 10);
    });
    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundData(fixture, 10, {
        from: fixture.regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: when data > maxAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundData(fixture, 10001, {
        revertMessage: 'CA: out of [min;max]',
      });
    });

    it('should fail: when data < minAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundData(fixture, 0.00000001, {
        revertMessage: 'CA: out of [min;max]',
      });
    });
  });

  describe.only('setRoundDataSafe', async () => {
    it('call from owner when no prev data is set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10);
    });
    it('call from owner when prev data is set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10);
      await setRoundDataSafe(fixture, 10.5);
    });
    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10, {
        from: fixture.regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: when data > maxAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10001, {
        revertMessage: 'CA: out of [min;max]',
      });
    });

    it('should fail: when data < minAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 0.00000001, {
        revertMessage: 'CA: out of [min;max]',
      });
    });

    it('should fail: when deviation is > 1%', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10);
      await setRoundDataSafe(fixture, 11);
    });
  });
});
