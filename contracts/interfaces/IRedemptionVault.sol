// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IManageableVault.sol";

/**
 * @title IRedemptionVault
 * @author RedDuck Software
 */
interface IRedemptionVault is IManageableVault {
    event SetMinAmountToRedeem(address indexed caller, uint256 newValue);

    /**
     * @notice creates a stUSD redemption request.
     * its a first step of stUSD redemption process
     * @param tokenOut stable coin token address to redeem to
     * @param amountStUsdIn amount of stUSD to redeem
     * @return requestId id of created request
     */
    function initiateRedemptionRequest(address tokenOut, uint256 amountStUsdIn)
        external
        returns (uint256 requestId);

    /**
     * @notice fulfills redemption request by a given `requestId`.
     * can be called only from permissioned actor
     * @param requestId id of a redemption request
     * @param amountUsdOut amount of USD token to transfer to user
     */
    function fulfillRedemptionRequest(uint256 requestId, uint256 amountUsdOut)
        external;

    /**
     * @notice cancels redemption request by a given `requestId`.
     * can be called only from permissioned actor
     * @param requestId id of a redemption request
     */
    function cancelRedemptionRequest(uint256 requestId) external;

    /**
     * @notice burns stUSD and transfers `amountUsdOut` of `tokenOut` to the user.
     * can be called only from permissioned actor
     * @param user address of user
     * @param tokenOut address of output USD token
     * @param amountStUsdIn amount of stUSD to redeem
     * @param amountUsdOut amount of USD token to send to user
     */
    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn,
        uint256 amountUsdOut
    ) external;

    /**
     * @notice updates `minUsdAmountToRedeem` storage value.
     * can be called only from permissioned actor
     * @param newValue new value of `minUsdAmountToRedeem`
     */
    function setMinAmountToRedeem(uint256 newValue) external;
}
