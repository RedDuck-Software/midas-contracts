// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IManageableVault.sol";

/**
 * @title IDepositVault
 * @author RedDuck Software
 */
interface IDepositVault is IManageableVault {
    event SetMinAmountToDeposit(address indexed caller, uint256 newValue);

    /**
     * @notice deposits USD token into vault and mints
     * stUSD using the DataFeed price
     * @param tokenIn address of USD token in
     * @param amountIn amount of `tokenIn` that will be taken from user
     * @return amountOut amount of stUSD that minted to user
     */
    function initiateDepositRequest(address tokenIn, uint256 amountIn)
        external
        returns (uint256 amountOut);

    /**
     * @notice mints stUSD to a `user` and doesnt transfer USD
     * from a `user`.
     * can be called only from permissioned actor.
     * @param requestId id of a deposit request
     * @param amountStUsdOut amount of stUSD calculated by admin
     */
    function fulfillDepositRequest(uint256 requestId, uint256 amountStUsdOut)
        external;

    /**
     * @notice cancels deposit request by a given `requestId`.
     * can be called only from permissioned actor
     * @param requestId id of a deposit request
     */
    function cancelDepositRequest(uint256 requestId) external;

    /**
     * @notice mints stUSD to user.
     * can be called only from permissioned actor
     * @param user address of user
     * @param tokenIn address of inout USD token
     * @param amountUsdIn amount of USD to deposit
     * @param amountStUsdOut amount of stUSD token to send to user
     */
    function manuallyDeposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn,
        uint256 amountStUsdOut
    ) external;

    /**
     * @notice sets new minimal amount to deposit.
     * can be called only from permissioned actor.
     * @param newValue new min. deposit value
     */
    function setMinAmountToDeposit(uint256 newValue) external;
}
