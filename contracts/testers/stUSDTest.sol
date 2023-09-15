// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../stUSD.sol";

contract stUSDTest is stUSD {
    function _disableInitializers() internal override {}
}
