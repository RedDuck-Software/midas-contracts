// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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
     * have GREENLISTED_ROLE
     */
    modifier onlyGreenlisted(address account) {
        _onlyGreenlisted(account);
        _;
    }

    /**
     * @dev upgradeable patter contract`s initializer
     * @param _accessControl MidasAccessControl contract address
     */
    function __Greenlistable_init(
        address _accessControl
    ) internal onlyInitializing {
        __WithMidasAccessControl_init(_accessControl);
    }

    /**
     * @notice adds given `account` to a greenlist
     */
    function addToGreenList(
        address account
    ) external onlyRole(GREENLIST_OPERATOR_ROLE, msg.sender) {
        accessControl.grantRole(GREENLISTED_ROLE, account);
    }

    /**
     * @notice removes given `account` from greenlist
     */
    function removeFromGreenList(
        address account
    ) external onlyRole(GREENLIST_OPERATOR_ROLE, msg.sender) {
        accessControl.revokeRole(GREENLISTED_ROLE, account);
    }

    /**
     * @dev checks that a given `account` doesnt
     * have GREENLISTED_ROLE
     */
    function _onlyGreenlisted(
        address account
    ) private view onlyRole(GREENLISTED_ROLE, account) {}
}
