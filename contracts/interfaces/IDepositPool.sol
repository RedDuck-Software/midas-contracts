// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDepositPool {
    function deposit(
        address tokenIn,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function withdraw(
        address token,
        uint256 amount,
        address withdrawTo
    ) external;

    function addPaymentToken(address token) external;

    function removePaymentToken(address token) external;

    function setFee(uint256 newFee) external returns (uint256);

    function getOutputAmountWithFee(
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    function fee() external view returns (uint256);
}
