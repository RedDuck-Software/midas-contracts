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
     * @notice actor that can change green list enable
     */
    bytes32 public constant GREENLIST_TOGGLER_ROLE =
        keccak256("GREENLIST_TOGGLER_ROLE");

    bool public greenlistEnabled;

    event SetGreenlistEnable(address indexed sender, bool enable);

    /**
     * @dev checks that a given `account`
     * have `greenlistedRole()`
     */
    modifier onlyGreenlisted(address account) {
        if (greenlistEnabled) _onlyGreenlisted(account);
        _;
    }
    /**
     * @dev checks that a given `account`
     * have `greenlistTogglerRole()`
     */
    modifier onlyGreenlistToggler(address account) {
        _onlyGreenlistToggler(account);
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

    function setGreenlistEnable(bool enable)
        external
        onlyGreenlistToggler(msg.sender)
    {
        require(greenlistEnabled != enable, "GL: same enable status");
        greenlistEnabled = enable;
        emit SetGreenlistEnable(msg.sender, enable);
    }

    /**
     * @notice AC role of a greenlist
     * @return role bytes32 role
     */
    function greenlistedRole() public view virtual returns (bytes32) {
        return GREENLISTED_ROLE;
    }

    /**
     * @notice AC role of a greenlist
     * @return role bytes32 role
     */
    function greenlistTogglerRole() public view virtual returns (bytes32) {
        return GREENLIST_TOGGLER_ROLE;
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

    /**
     * @dev checks that a given `account`
     * have a `greenlistTogglerRole()`
     */
    function _onlyGreenlistToggler(address account)
        private
        view
        onlyRole(greenlistTogglerRole(), account)
    {}
}
