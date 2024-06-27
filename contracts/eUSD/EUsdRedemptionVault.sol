// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./EUsdMidasAccessControlRoles.sol";
import "../RedemptionVault.sol";

/**
 * @title EUsdRedemptionVault
 * @notice Smart contract that handles eUSD redeeming
 * @author RedDuck Software
 */
contract EUsdRedemptionVault is RedemptionVault, EUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return E_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return E_USD_GREENLISTED_ROLE;
    }
}
