// SPDX-License-Identifier: UNLICENSEDI
pragma solidity ^0.8.0;

import "../access/Pausable.sol";

contract PausableTester is Pausable {
    function initialize(address _accessControl) external initializer {
        __Pausable_init(_accessControl);
    }

    function pauseAdminRole() public view override returns (bytes32) {
        return accessControl.DEFAULT_ADMIN_ROLE();
    }
}
