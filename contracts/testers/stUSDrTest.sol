// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../stUSDr.sol";

//solhint-disable contract-name-camelcase
contract stUSDrTest is stUSDr {
    function mintTest(address _receiver, uint256 _amountShares) external {
        _mint(_receiver, _amountShares);
    }

    function transferTest(
        address from,
        address to,
        uint256 _amountShares
    ) external {
        _transfer(from, to, _amountShares);
    }

    function approveTest(
        address from,
        address to,
        uint256 _amountShares
    ) external {
        _approve(from, to, _amountShares);
    }

    function initializeWithoutInitializer(
        address _ac,
        address _mTBILL,
        address _ib01UsdDataFeed
    ) external {
        __RebaseERC20_init(_ac, _mTBILL, _ib01UsdDataFeed);
    }

    function burnTest(address _from, uint256 _amountToken) external {
        _burn(_from, _amountToken);
    }

    function _disableInitializers() internal override {}
}
