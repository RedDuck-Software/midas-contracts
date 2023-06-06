// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IManageableVault {
    event WithdrawToken(
        address indexed caller,
        address indexed token,
        address indexed withdrawTo,
        uint256 amount
    );

    event AddPaymentToken(address indexed token, address indexed caller);

    event RemovePaymentToken(address indexed token, address indexed caller);

    event SetFee(address indexed caller, uint256 newFee);

    function withdrawToken(
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

    function getFee() external view returns (uint256);
}
