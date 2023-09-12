// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../access/MidasAccessControl.sol";

contract MidasAccessControlTest is MidasAccessControl {
    function _disableInitializers() internal override {}
}
