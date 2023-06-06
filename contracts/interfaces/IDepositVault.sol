// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IManageableVault.sol";

interface IDepositVault is IManageableVault {
    event Deposit(
        address indexed user,
        address indexed tokenIn,
        bool indexed isManuallyFilled,
        uint256 amountUsdIn,
        uint256 amountStUsdOut
    );

    event SetMinAmountToDeposit(address indexed caller, uint256 newValue);

    function deposit(
        address tokenIn,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function fulfillManualDeposit(
        address user,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function fulfillManualDeposit(
        address user,
        uint256 amountUsdIn,
        uint256 amountStUsdOut
    ) external;

    function setMinAmountToDeposit(uint256 newValue) external;
}
