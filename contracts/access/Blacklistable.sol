// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./WithMidasAccessControl.sol";

/**
 * @title Blacklistable
 * @notice Base contract that implements basic functions and modifiers
 * to work with blacklistable
 * @author RedDuck Software
 */
abstract contract Blacklistable is WithMidasAccessControl {
    /**
     * @dev checks that a given `account` doesnt
     * have BLACKLISTED_ROLE
     */
    modifier onlyNotBlacklisted(address account) {
        _onlyNotBlacklisted(account);
        _;
    }

    /**
     * @dev upgradeable patter contract`s initializer
     * @param _accessControl MidasAccessControl contract address
     */
    function __Blacklistable_init(address _accessControl)
        internal
        onlyInitializing
    {
        __WithMidasAccessControl_init(_accessControl);
    }

    /**
     * @notice adds given `account` to blacklist
     */
    function addToBlackList(address account)
        external
        onlyRole(BLACKLIST_OPERATOR_ROLE, msg.sender)
    {
        accessControl.grantRole(BLACKLISTED_ROLE, account);
    }

    /**
     * @notice removes given `account` from blacklist
     */
    function removeFromBlackList(address account)
        external
        onlyRole(BLACKLIST_OPERATOR_ROLE, msg.sender)
    {
        accessControl.revokeRole(BLACKLISTED_ROLE, account);
    }

    /**
     * @dev checks that a given `account` doesnt
     * have BLACKLISTED_ROLE
     */
    function _onlyNotBlacklisted(address account)
        private
        view
        onlyNotRole(BLACKLISTED_ROLE, account)
    {}
}
