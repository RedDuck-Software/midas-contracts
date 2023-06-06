// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IManageableVault.sol";

interface IRedemptionVault is IManageableVault {
    event InitiateRedeemptionRequest(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenOut,
        uint256 amountStUsdIn,
        uint256 amountUsdOut
    );

    event FulfillRedeemptionRequest(
        address indexed caller,
        uint256 indexed requestId
    );

    event CancelRedemptionRequest(
        uint256 indexed requestId,
        bytes32 indexed reasone
    );

    event DepositToken(
        address indexed caller,
        address indexed token,
        uint256 amount
    );

    event SetMinAmountToRedeem(address indexed caller, uint256 newValue);

    function initiateRedemptionRequest(
        address tokenOut,
        uint256 amountStUsdIn
    ) external returns (uint256 requestId);

    function fulfillRedemptionRequest(
        uint256 requestId
    ) external returns (uint256 amountUsdOut);

    function cancelRedemptionRequest(uint256 requestId) external;

    function cancelRedemptionRequest(
        uint256 requestId,
        bytes32 reasone
    ) external;

    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn
    ) external;

    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn,
        uint256 amoutUsdOut
    ) external;

    function depositToken(address token, uint256 amount) external;

    function setMinAmountToRedeem(uint256 newValue) external;
}
