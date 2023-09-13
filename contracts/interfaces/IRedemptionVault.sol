// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IManageableVault.sol";

/**
 * @title IRedemptionVault
 * @author RedDuck Software
 */
interface IRedemptionVault is IManageableVault {
    event SetMinAmountToRedeem(address indexed caller, uint256 newValue);

    /**
     * @notice first step of stUSD redemption process
     * Burns stUSD from the user, and saves a redemption request
     * into the storage. Then request should be validated off-chain
     * and fulfilled by the vault`s admin by calling the
     * `fulfillRedemptionRequest`
     * @param tokenOut stable coin token address to redeem to
     * @param amountStUsdIn amount of stUSD to redeem
     * @return requestId id of created request
     */
    function initiateRedemptionRequest(address tokenOut, uint256 amountStUsdIn)
        external
        returns (uint256 requestId);

    /**
     * @notice second step of the depositing proccess.
     * After deposit request was validated off-chain,
     * admin calculates how much of USD should be transferred to the user.
     * can be called only from permissioned actor.
     * @param requestId id of a redemption request
     * @param amountUsdOut amount of USD token to transfer to user
     */
    function fulfillRedemptionRequest(uint256 requestId, uint256 amountUsdOut)
        external;

    /**
     * @notice cancels redemption request by a given `requestId`
     * and mints stUSD back to the user. 
     * can be called only from permissioned actor
     * @param requestId id of a redemption request
     */
    function cancelRedemptionRequest(uint256 requestId) external;

    /**
     * @notice wrapper over the stUSD.burn() function.
     * Burns `amountStUsdIn` from the `user` and emits the 
     * event to be able to track this redemption off-chain.
     * can be called only from vault`s admin
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
}
