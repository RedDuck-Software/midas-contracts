// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MidasAccessControl.sol";

abstract contract WithMidasAccessControl is MidasAccessControlRoles {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    MidasAccessControl public accessControl;

    modifier onlyRole(bytes32 role) {
        require(accessControl.hasRole(role, msg.sender), "WMAC: hasnt role");
        _;
    }

    modifier onlyNotRole(bytes32 role) {
        require(!accessControl.hasRole(role, msg.sender), "WMAC: has role");
        _;
    }

    constructor(address _accessControl) {
        accessControl = MidasAccessControl(_accessControl);
    }

    function grantRole(
        bytes32 role,
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        accessControl.grantRole(role, account);
    }


    function revokeRole(
        bytes32 role,
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        accessControl.revokeRole(role, account);

    }
}