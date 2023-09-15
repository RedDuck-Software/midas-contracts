import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { defaultDeploy } from './common/fixtures';
import { PausableTester__factory } from '../typechain-types';

describe('Pausable', () => {
  it('deployment', async () => {
    const { pausableTester, roles } = await loadFixture(defaultDeploy);

    expect(await pausableTester.pauseAdminRole()).eq(roles.defaultAdmin);
  });


  it('onlyInitializing', async () => {
    const { accessControl, owner } = await loadFixture(
      defaultDeploy,
    );

    const pausable = await new PausableTester__factory(owner).deploy();
    
    await expect(
      pausable.initializeWithoutInitializer(
        accessControl.address
      ),
    ).revertedWith('Initializable: contract is not initializing');
  });


  describe('onlyPauseAdmin modifier', async () => {
    it('fail: can`t change state if doesn`t have role', async () => {
      const { pausableTester, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        pausableTester.connect(regularAccounts[0]).changePauseState(true),
      ).to.revertedWith('WMAC: hasnt role');
    });

    it('can change state if has role', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await expect(pausableTester.changePauseState(true)).to.not.reverted;
    });
  });

  describe('changePauseState(bool)', async () => {
    it('fail: can`t change if state is the same', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await expect(pausableTester.changePauseState(false)).to.revertedWith(
        'P: same state',
      );
    });

    it('can change state', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await expect(pausableTester.changePauseState(true)).to.emit(
        pausableTester,
        pausableTester.interface.events['ChangeState(bool)'].name,
      );

      expect(await pausableTester.getIsOnPause()).to.eq(true);

      await expect(pausableTester.changePauseState(false)).to.emit(
        pausableTester,
        pausableTester.interface.events['ChangeState(bool)'].name,
      );

      expect(await pausableTester.getIsOnPause()).to.eq(false);
    });
  });
});
