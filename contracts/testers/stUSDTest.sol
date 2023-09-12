// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../RedemptionVault.sol";

contract RedemptionVaultTest is RedemptionVault {
    function _disableInitializers() internal override {}
}
