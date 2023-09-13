// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IManageableVault.sol";

/**
 * @title IDepositVault
 * @author RedDuck Software
 */
interface IDepositVault is IManageableVault {
    event SetMinAmountToDeposit(address indexed caller, uint256 newValue);

    /**
     * @notice first step of the depositing proccess.
     * Transfers stablecoin from the user and saves the deposit request
     * into the storage. Then request should be validated off-chain
     * and fulfilled by the vault`s admin by calling the
     * `fulfillDepositRequest`
     * @param tokenIn address of USD token in
     * @param amountIn amount of `tokenIn` that will be taken from user
     * @return amountOut amount of stUSD that minted to user
     */
    function initiateDepositRequest(address tokenIn, uint256 amountIn)
        external
        returns (uint256 amountOut);

    /**
     * @notice second step of the depositing proccess.
     * After deposit request was validated off-chain,
     * admin calculates how much of stUSD`s should be minted to the user.
     * can be called only from permissioned actor.
     * @param requestId id of a deposit request
     * @param amountStUsdOut amount of stUSD to mint
     */
    function fulfillDepositRequest(uint256 requestId, uint256 amountStUsdOut)
        external;

    /**
     * @notice cancels the deposit request by a given `requestId`
     * and transfers all the tokens locked for this request back
     * to the user.
     * can be called only from vault`s admin
     * @param requestId id of a deposit request
     */
    function cancelDepositRequest(uint256 requestId) external;

    /**
     * @notice wrapper over the stUSD.mint() function.
     * Mints `amountStUsdOut` to the `user` and emits the 
     * event to be able to track this deposit off-chain.
     * can be called only from vault`s admin
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
