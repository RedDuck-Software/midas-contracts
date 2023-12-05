// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IManageableVault.sol";

/**
 * @title IDepositVault
 * @author RedDuck Software
 */
interface IDepositVault is IManageableVault {
    event SetMinAmountToDeposit(address indexed caller, uint256 newValue);

    event Deposit(
        uint256 indexed id,
        address indexed user,
        address indexed usdTokenIn,
        uint256 amount
    );

    event Fulfill(uint256 indexed id);

    event FreeFromMinDeposit(address indexed user);

    /**
     * @notice first step of the depositing proccess.
     * Transfers stablecoin from the user and saves the deposit request
     * into the storage. Then request should be validated off-chain
     * and fulfilled by the vault`s admin by calling the
     * `fulfillDepositRequest`
     * @param tokenIn address of USD token in
     * @param amountIn amount of `tokenIn` that will be taken from user
     */
    function deposit(address tokenIn, uint256 amountIn) external;

    /**
     * @notice frees given `user` from the minimal deposit
     * amount validation in `initiateDepositRequest`
     * @param user address of user
     */
    function freeFromMinDeposit(address user) external;

    /**
     * @notice sets new minimal amount to deposit in EUR.
     * can be called only from vault`s admin
     * @param newValue new min. deposit value
     */
    function setMinAmountToDeposit(uint256 newValue) external;
}
