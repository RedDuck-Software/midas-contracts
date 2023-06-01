// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./MidasAccessControlRoles.sol";

contract MidasAccessControl is AccessControl, MidasAccessControlRoles {
    constructor() { 
        _setupRoles();    
    }

    function _setupRoles() private {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setupRole(WHITELIST_OPERATOR_ROLE, msg.sender);
        _setupRole(BLACKLIST_OPERATOR_ROLE, msg.sender);
        
        _setupRole(ST_USD_MINT_OPERATOR_ROLE, msg.sender);
        _setupRole(ST_USD_BURN_OPERATOR_ROLE, msg.sender);
        _setupRole(ST_USD_PAUSE_OPERATOR_ROLE, msg.sender);
    }
}
