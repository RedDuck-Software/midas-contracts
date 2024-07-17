// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../abstract/ManageableVault.sol";

contract ManageableVaultTester is ManageableVault {
    function _disableInitializers() internal override {}

    function initialize(
        address _accessControl,
        address _mTbill,
        address _tokensReceiver,
        address _etfDataFeed
    ) external initializer {
        __ManageableVault_init(_accessControl, _mTbill, _tokensReceiver, _etfDataFeed);
    }

    function initializeWithoutInitializer(
        address _accessControl,
        address _mTbill,
        address _tokensReceiver,
        address _etfDataFeed
    ) external {
        __ManageableVault_init(_accessControl, _mTbill, _tokensReceiver, _etfDataFeed);
    }

    function vaultRole() public view virtual override returns (bytes32) {}
}
