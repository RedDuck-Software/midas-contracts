// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./WithMidasAccessControl.sol";

abstract contract Whitelistable is WithMidasAccessControl {
    modifier onlyWhitelisted() {
        _onlyWhitelisted();
        _;
    }

    constructor(address _ac) WithMidasAccessControl(_ac) {}

    function addToWhiteList(
        address account
    ) external onlyRole(WHITELIST_OPERATOR_ROLE) {
        accessControl.grantRole(WHITELISTED_ROLE, account);
    }

    function removeFromWhiteList(
        address account
    ) external onlyRole(WHITELIST_OPERATOR_ROLE) {
        accessControl.revokeRole(WHITELISTED_ROLE, account);
    }

    function _onlyWhitelisted() private view onlyRole(WHITELISTED_ROLE) {}
}
