// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./abstract/RebaseERC20.sol";

contract miUSD is RebaseERC20 {
    function initialize(
        address _ac,
        address _mTBILL,
        address _ib01UsdDataFeed
    ) external initializer {
        __RebaseERC20_init(_ac, _mTBILL, _ib01UsdDataFeed);
    }

    function name() public pure override returns (string memory) {
        return "miUSD";
    }

    function symbol() public pure override returns (string memory) {
        return "miUSD";
    }
}
