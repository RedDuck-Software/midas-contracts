// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./abstract/RebaseERC20.sol";

contract stUSDr is RebaseERC20 {
    function initialize(
        address _ac,
        address _mTBILL,
        address _ib01UsdDataFeed
    ) external initializer {
        __RebaseERC20_init(_ac, _mTBILL, _ib01UsdDataFeed);
    }

    function name() public pure override returns (string memory) {
        return "stUSDr";
    }

    function symbol() public pure override returns (string memory) {
        return "stUSDr";
    }
}
