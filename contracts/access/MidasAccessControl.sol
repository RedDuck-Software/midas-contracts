// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./MidasAccessControlRoles.sol";

contract MidasAccessControl is
    AccessControlUpgradeable,
    MidasAccessControlRoles
{
    function initialize() external initializer {
        __AccessControl_init();
        _setupRoles();
    }

    function grantRoleMult(
        bytes32[] memory roles,
        address[] memory addresses
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(roles.length == addresses.length, "MAC: mismatch arrays");

        for (uint i; i < roles.length; i++) {
            _grantRole(roles[i], addresses[i]);
        }
    }

    function _setupRoles() private {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setRoleAdmin(BLACKLISTED_ROLE, BLACKLIST_OPERATOR_ROLE);
        _setRoleAdmin(GREENLISTED_ROLE, GREENLIST_OPERATOR_ROLE);

        _setupRole(GREENLIST_OPERATOR_ROLE, msg.sender);
        _setupRole(BLACKLIST_OPERATOR_ROLE, msg.sender);

        _setupRole(ST_USD_MINT_OPERATOR_ROLE, msg.sender);
        _setupRole(ST_USD_BURN_OPERATOR_ROLE, msg.sender);
        _setupRole(ST_USD_PAUSE_OPERATOR_ROLE, msg.sender);
    }
}
