// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../DepositVault.sol";

contract DepositVaultTest is DepositVault {
    function _disableInitializers() internal override { }
}
