// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../access/WithMidasAccessControl.sol";

contract WithMidasAccessControlTester is WithMidasAccessControl {
    constructor(
        address _accessControl
    ) WithMidasAccessControl(_accessControl) {}


    function grantRoleTester(
        bytes32 role,
        address account
    ) external {
        grantRole(role, account);
    }

    function revokeRoleTester(
        bytes32 role,
        address account
    ) external {
        revokeRole(role, account);
    }
    function withOnlyRole(
        bytes32 role,
        address account
    ) external onlyRole(role, account) {}

    function withOnlyNotRole(
        bytes32 role,
        address account
    ) external onlyNotRole(role, account) {}
}
