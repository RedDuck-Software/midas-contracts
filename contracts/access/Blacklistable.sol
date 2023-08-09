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
     * @dev checks that a given `account` doesnt
     * have BLACKLISTED_ROLE
     */
    function _onlyNotBlacklisted(address account)
        private
        view
        onlyNotRole(BLACKLISTED_ROLE, account)
    {}
}
