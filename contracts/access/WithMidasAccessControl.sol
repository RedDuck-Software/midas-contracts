// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MidasAccessControl.sol";

/**
 * @title WithMidasAccessControl
 * @notice Base contract that consumes MidasAccessControl
 * @author RedDuck Software
 */
abstract contract WithMidasAccessControl is
    Initializable,
    MidasAccessControlRoles
{
    /**
     * @notice admin role
     */
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @notice MidasAccessControl contract address
     */
    MidasAccessControl public accessControl;

    /**
     * @dev checks that given `address` have `role`
     */
    modifier onlyRole(bytes32 role, address account) {
        _onlyRole(role, account);
        _;
    }

    /**
     * @dev checks that given `address` do not have `role`
     */
    modifier onlyNotRole(bytes32 role, address account) {
        _onlyNotRole(role, account);
        _;
    }

    /**
     * @dev upgradeable patter contract`s initializer
     */
    function __WithMidasAccessControl_init(
        address _accessControl
    ) internal onlyInitializing {
        accessControl = MidasAccessControl(_accessControl);
    }

    /**
     * @dev grants `role` to `account` using MidasAccessControl
     * @param role bytes32 role descriptor
     * @param account address to grant role to
     */
    function grantRole(bytes32 role, address account) internal {
        accessControl.grantRole(role, account);
    }

    /**
     * @dev revokes `role` from `account` using MidasAccessControl
     * @param role bytes32 role descriptor
     * @param account address to revoke role from
     */
    function revokeRole(bytes32 role, address account) internal {
        accessControl.revokeRole(role, account);
    }

    /**
     * @dev checks that given `address` have `role`
     */
    function _onlyRole(bytes32 role, address account) internal view {
        require(accessControl.hasRole(role, account), "WMAC: hasnt role");
    }

    /**
     * @dev checks that given `address` do not have `role`
     */
    function _onlyNotRole(bytes32 role, address account) internal view {
        require(!accessControl.hasRole(role, account), "WMAC: has role");
    }
}
