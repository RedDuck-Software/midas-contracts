// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../stUSDr.sol";

//solhint-disable contract-name-camelcase
contract stUSDrTest is stUSDr {
    function _disableInitializers() internal override {}
}
