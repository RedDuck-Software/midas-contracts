// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./WithMidasAccessControl.sol";

/**
 * @title Greenlistable
 * @notice Base contract that implements basic functions and modifiers
 * to work with greenlistable
 * @author RedDuck Software
 */
abstract contract Greenlistable is WithMidasAccessControl {
    /**
     * @dev checks that a given `account`
     * have `greenlistedRole()`
     */
    modifier onlyGreenlisted(address account) {
        _onlyGreenlisted(account);
        _;
    }

    /**
     * @dev upgradeable pattern contract`s initializer
     * @param _accessControl MidasAccessControl contract address
     */
    // solhint-disable func-name-mixedcase
    function __Greenlistable_init(address _accessControl)
        internal
        onlyInitializing
    {
        __WithMidasAccessControl_init(_accessControl);
    }

    /**
     * @notice AC role of a greenlist
     * @return role bytes32 role
     */
    function greenlistedRole() public view virtual returns (bytes32) {
        return GREENLISTED_ROLE;
    }

    /**
     * @dev checks that a given `account`
     * have a `greenlistedRole()`
     */
    function _onlyGreenlisted(address account)
        private
        view
        onlyRole(greenlistedRole(), account)
    {}
}
