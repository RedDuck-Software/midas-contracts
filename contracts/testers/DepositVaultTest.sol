// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";

contract DepositVaultTest is DepositVault {
    function _disableInitializers() internal override {}

    function tokenTransferFromToTester(
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) external {
        _tokenTransferFromTo(token, from, to, amount, tokenDecimals);
    }

    function tokenTransferToUserTester(
        address token,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) external {
        _tokenTransferToUser(token, to, amount, tokenDecimals);
    }
}
