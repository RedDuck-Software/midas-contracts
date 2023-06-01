// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./WithMidasAccessControl.sol";

abstract contract Blacklistable is WithMidasAccessControl {
    modifier onlyNotBlacklisted(address account) {
        _onlyNotBlacklisted(account);
        _;
    }

    constructor(address _ac) WithMidasAccessControl(_ac) {}

    function addToBlackList(
        address account
    ) external onlyRole(BLACKLIST_OPERATOR_ROLE, msg.sender) {
        accessControl.grantRole(BLACKLISTED_ROLE, account);
    }

    function removeFromBlackList(
        address account
    ) external onlyRole(BLACKLIST_OPERATOR_ROLE, msg.sender) {
        accessControl.revokeRole(BLACKLISTED_ROLE, account);
    }

    function _onlyNotBlacklisted(address account) private view onlyNotRole(BLACKLISTED_ROLE, account) {}
}
