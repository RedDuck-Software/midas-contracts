// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IManageableVault.sol";

/**
 * @title IDepositVault
 * @author RedDuck Software
 */
interface IDepositVault is IManageableVault {
    event Deposit(
        address indexed user,
        address indexed tokenIn,
        bool indexed isManuallyFilled,
        uint256 amountUsdIn,
        uint256 amountStUsdOut
    );

    event SetMinAmountToDeposit(address indexed caller, uint256 newValue);

    /**
     * @notice deposits USD token into vault and mints
     * stUSD using the DataFeed price
     * @param tokenIn address of USD token in
     * @param amountIn amount of `tokenIn` that will be takken from user
     * @return amountOut amount of stUSD that minted to user
     */
    function deposit(
        address tokenIn,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    /**
     * @notice mints stUSD to a `user` and doesnt transfer USD
     * from a `user`.
     * can be called only from permissioned actor.
     * @param user address of user to mint stUSD to
     * @param amountUsdIn amount of USD provided by user
     * @return amountStUsdOut amount stUSD that minted to user
     */
    function fulfillManualDeposit(
        address user,
        uint256 amountUsdIn
    ) external returns (uint256 amountStUsdOut);

    /**
     * @notice mints stUSD to a `user` and doesnt transfer USD
     * from a `user`.
     * can be called only from permissioned actor.
     * @param user address of user to mint stUSD to
     * @param amountUsdIn address of user to mint stUSD to
     * @param amountStUsdOut amount of stUSD that should be minted to user
     */
    function fulfillManualDeposit(
        address user,
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
