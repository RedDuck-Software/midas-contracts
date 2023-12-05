// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title IManageableVault
 * @author RedDuck Software
 */
interface IManageableVault {
    event WithdrawToken(
        address indexed caller,
        address indexed token,
        address indexed withdrawTo,
        uint256 amount
    );

    event AddPaymentToken(address indexed token, address indexed caller);

    event RemovePaymentToken(address indexed token, address indexed caller);

    event SetFee(address indexed caller, address indexed token, uint256 newFee);

    /**
     * @notice withdraws `amount` of a given `token` from the contract.
     * can be called only from permissioned actor.
     * @param token token address
     * @param amount token amount
     * @param withdrawTo withdraw destination address
     */
    function withdrawToken(
        address token,
        uint256 amount,
        address withdrawTo
    ) external;

    /**
     * @notice adds a token to the stablecoins list.
     * can be called only from permissioned actor.
     * @param token token address
     */
    function addPaymentToken(address token) external;

    /**
     * @notice removes a token from stablecoins list.
     * can be called only from permissioned actor.
     * @param token token address
     */
    function removePaymentToken(address token) external;
}
