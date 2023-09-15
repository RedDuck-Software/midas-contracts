// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../abstract/ManageableVault.sol";

contract ManageableVaultTester is ManageableVault {
    function initialize(address _accessControl, address _stUsd)
        external
        initializer
    {
        __ManageableVault_init(_accessControl, _stUsd);
    }

    function initializeWithoutInitializer(
        address _accessControl,
        address _stUsd
    ) external {
        __ManageableVault_init(_accessControl, _stUsd);
    }

    function vaultRole() public view virtual override returns (bytes32) {}

    function getFee(address) external view override returns (uint256) {}
}
