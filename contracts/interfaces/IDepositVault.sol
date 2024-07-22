// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IManageableVault.sol";

/**
 * @title IDepositVault
 * @author RedDuck Software
 */
interface IDepositVault is IManageableVault {
    /**
     * @param caller function caller (msg.sender)
     * @param newValue new min amount to deposit value
     */
    event SetMinAmountToDeposit(address indexed caller, uint256 newValue);

    /**
     * @param user address that initiated the deposit
     * @param usdTokenIn address of usd token
     * @param amount amount of `usdTokenIn`
     * @param fee amount of fee from `usdTokenIn`
     * @param minted amount of minted mtBill
     */
    event Deposit(
        address indexed user,
        address indexed usdTokenIn,
        uint256 amount,
        uint256 fee,
        uint256 minted
    );

    /**
     * @param user address that was freed from min deposit check
     */
    event FreeFromMinDeposit(address indexed user);

    /**
     * @notice depositing proccess with auto mint if 
     * account fit daily limit.
     * Transfers usd token from the user.
     * Then request should be validated off-chain and if
     * everything is okay, admin should mint necessary amount
     * of mTBILL token back to user
     * @param tokenIn address of USD token in
     * @param amountIn amount of `tokenIn` that will be taken from user
     */
    function depositInstant(address tokenIn, uint256 amountIn) external;

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
