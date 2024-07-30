// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IManageableVault.sol";

struct Request {
    address sender;
    address tokenOut;
    RequestStatus status;
    uint256 amountMToken;
    uint256 mTokenRate;
    uint256 tokenOutRate;
}

/**
 * @title IRedemptionVault
 * @author RedDuck Software
 */
interface IRedemptionVault is IManageableVault {
    
    event RedeemInstant(
        address indexed user,
        address indexed usdTokenOut,
        uint256 amount,
        uint256 feeAmount,
        uint256 amountTokenOut
    );

    event RedeemRequest(
        uint256 indexed requestId,
        address indexed user,
        address indexed usdTokenOut,
        uint256 amountMTokenIn
    );

    event SetMinCryptoRedeemAmount(
        address indexed caller,
        uint256 newMinAmount
    );

    event SetMinFiatRedeemAmount(
        address indexed caller,
        uint256 newMinAmount
    );

    event SetFiatAdditionalFee(
        address indexed caller,
        uint256 newfee
    );

    /**
     * @notice Transfers mTBILL from the user to the admin.
     * After that admin should validate the redemption and transfer
     * selected `tokenOut` back to user
     * @param tokenOut stable coin token address to redeem to
     * @param amountMTokenIn amount of mTBILL to redeem
     */
    function redeemInstant(address tokenOut, uint256 amountMTokenIn) external;
}
