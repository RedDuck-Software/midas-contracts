// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./MidasAccessControlRoles.sol";
import "../abstract/MidasInitializable.sol";

/**
 * @title MidasAccessControl
 * @notice Smart contract that stores all roles for Midas project
 * @author RedDuck Software
 */
contract MidasAccessControl is
    AccessControlUpgradeable,
    MidasInitializable,
    MidasAccessControlRoles
{
    /**
     * @notice upgradeable pattern contract`s initializer
     */
    function initialize() external initializer {
        __AccessControl_init();
        _setupRoles(msg.sender);
    }

    /**
     * @notice Sets `adminRole` as ``role``'s admin role.
     * @param role role to set `adminRole` for
     * @param adminRole role that can manage `role`
     */
    function setRoleAdmin(bytes32 role, bytes32 adminRole) external {
        _checkRole(getRoleAdmin(role), msg.sender);
        _setRoleAdmin(role, adminRole);
    }

    /**
     * @notice Sets `adminRole` as ``role``'s admin role.
     * @dev length`s of 2 arays should match
     * @param roles roles to set `adminRoles[i]` for
     * @param adminRoles roles that can manage `roles[i]`
     */
    function setRoleAdminMult(
        bytes32[] memory roles,
        bytes32[] memory adminRoles
    ) external {
        require(roles.length == adminRoles.length, "MAC: mismatch arrays");

        for (uint256 i = 0; i < roles.length; i++) {
            _checkRole(getRoleAdmin(roles[i]), msg.sender);
            _setRoleAdmin(roles[i], adminRoles[i]);
        }
    }

    /**
     * @notice grant multiple roles to multiple users
     * in one transaction
     * @dev length`s of 2 arays should match
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function grantRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(roles.length == addresses.length, "MAC: mismatch arrays");

        for (uint256 i = 0; i < roles.length; i++) {
            _checkRole(getRoleAdmin(roles[i]), msg.sender);
            _grantRole(roles[i], addresses[i]);
        }
    }

    /**
     * @notice revoke multiple roles from multiple users
     * in one transaction
     * @dev length`s of 2 arays should match
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function revokeRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(roles.length == addresses.length, "MAC: mismatch arrays");
        for (uint256 i = 0; i < roles.length; i++) {
            _checkRole(getRoleAdmin(roles[i]), msg.sender);
            _revokeRole(roles[i], addresses[i]);
        }
    }

    //solhint-disable disable-next-line
    function renounceRole(bytes32, address) public override {
        revert("MAC: Forbidden");
    }

    /**
     * @dev setup roles during the contracts initialization
     */
    function _setupRoles(address admin) private {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);

        _setupRole(DEPOSIT_VAULT_ADMIN_ROLE, admin);
        _setupRole(REDEMPTION_VAULT_ADMIN_ROLE, admin);

        _setRoleAdmin(BLACKLISTED_ROLE, BLACKLIST_OPERATOR_ROLE);
        _setRoleAdmin(GREENLISTED_ROLE, GREENLIST_OPERATOR_ROLE);

        _setupRole(GREENLIST_OPERATOR_ROLE, admin);
        _setupRole(BLACKLIST_OPERATOR_ROLE, admin);

        _setupRole(M_TBILL_MINT_OPERATOR_ROLE, admin);
        _setupRole(M_TBILL_BURN_OPERATOR_ROLE, admin);
        _setupRole(M_TBILL_PAUSE_OPERATOR_ROLE, admin);
    }
}
