// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IManageableVault.sol";

interface IRedemptionVault is IManageableVault {
    event InitiateRedeemptionRequest(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenOut,
        uint256 amountStUsdIn
    );

    event FulfillRedeemptionRequest(
        address indexed caller,
        uint256 indexed requestId,
        uint256 amountUsdOut
    );

    event CancelRedemptionRequest(uint256 indexed requestId);

    event ManuallyRedeem(
        address indexed caller,
        address indexed user,
        address indexed tokenOut,
        uint256 amountStUsdIn,
        uint256 amountUsdOut
    );

    event SetMinAmountToRedeem(address indexed caller, uint256 newValue);

    function initiateRedemptionRequest(
        address tokenOut,
        uint256 amountStUsdIn
    ) external returns (uint256 requestId);

    function fulfillRedemptionRequest(
        uint256 requestId,
        uint256 amountUsdOut
    ) external;

    function cancelRedemptionRequest(uint256 requestId) external;

    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn
    ) external returns (uint256 amountUsdOut);

    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn,
        uint256 amountUsdOut
    ) external;

    function setMinAmountToRedeem(uint256 newValue) external;
}
