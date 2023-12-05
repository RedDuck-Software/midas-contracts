// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../abstract/ManageableVault.sol";

contract ManageableVaultTester is ManageableVault {
    function initialize(
        address _accessControl,
        address _stUsd,
        address _tokensReceiver
    ) external initializer {
        __ManageableVault_init(_accessControl, _stUsd, _tokensReceiver);
    }

    function initializeWithoutInitializer(
        address _accessControl,
        address _stUsd,
        address _tokensReceiver
    ) external {
        __ManageableVault_init(_accessControl, _stUsd, _tokensReceiver);
    }

    function vaultRole() public view virtual override returns (bytes32) {}
}
