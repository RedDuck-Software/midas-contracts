// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract MidasAccessControlRoles {
    bytes32 public constant GREENLIST_OPERATOR_ROLE =
        keccak256("GREENLIST_OPERATOR_ROLE");
    bytes32 public constant BLACKLIST_OPERATOR_ROLE =
        keccak256("BLACKLIST_OPERATOR_ROLE");
    bytes32 public constant ST_USD_MINT_OPERATOR_ROLE =
        keccak256("ST_USD_MINT_OPERATOR_ROLE");
    bytes32 public constant ST_USD_BURN_OPERATOR_ROLE =
        keccak256("ST_USD_BURN_OPERATOR_ROLE");
    bytes32 public constant ST_USD_PAUSE_OPERATOR_ROLE =
        keccak256("ST_USD_PAUSE_OPERATOR_ROLE");
    bytes32 public constant DEPOSIT_VAULT_ADMIN =
        keccak256("DEPOSIT_VAULT_ADMIN");

    bytes32 public constant GREENLISTED_ROLE = keccak256("GREENLISTED_ROLE");
    bytes32 public constant BLACKLISTED_ROLE = keccak256("BLACKLISTED_ROLE");
}
