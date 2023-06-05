// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDepositPool {
    event Deposit(
        address indexed user,
        address indexed tokenIn,
        bool indexed isManuallyFilled,
        uint256 amountUsdIn,
        uint256 amountStUsdOut
    );

    event Withdraw(
        address indexed caller,
        address indexed token,
        address indexed to,
        uint256 amount
    );

    event AddPaymentToken(address indexed token, address indexed caller);

    event RemovePaymentToken(address indexed token, address indexed caller);

    event SetFee(address indexed caller, uint256 newFee);

    function deposit(
        address tokenIn,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function fulfillManualDeposit(
        address user,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function withdraw(
        address token,
        uint256 amount,
        address withdrawTo
    ) external;

    function addPaymentToken(address token) external;

    function removePaymentToken(address token) external;

    function setFee(uint256 newFee) external;

    function getOutputAmountWithFee(
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    function fee() external view returns (uint256);
}
