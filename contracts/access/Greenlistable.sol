// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./WithMidasAccessControl.sol";

abstract contract Greenlistable is WithMidasAccessControl {
    modifier onlyGreenlisted(address account) {
        _onlyGreenlisted(account);
        _;
    }

    function __Greenlistable_init(
        address _accessControl
    ) internal onlyInitializing {
        __WithMidasAccessControl_init(_accessControl);
    }

    function addToGreenList(
        address account
    ) external onlyRole(GREENLIST_OPERATOR_ROLE, msg.sender) {
        accessControl.grantRole(GREENLISTED_ROLE, account);
    }

    function removeFromGreenList(
        address account
    ) external onlyRole(GREENLIST_OPERATOR_ROLE, msg.sender) {
        accessControl.revokeRole(GREENLISTED_ROLE, account);
    }

    function _onlyGreenlisted(
        address account
    ) private view onlyRole(GREENLISTED_ROLE, account) {}
}
