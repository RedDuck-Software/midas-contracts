// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IManageableVault {
    event WithdrawToken(
        address indexed caller,
        address indexed token,
        address indexed withdrawTo,
        uint256 amount
    );

    event AddPaymentToken(address indexed token, address indexed caller);

    event RemovePaymentToken(address indexed token, address indexed caller);

    event SetFee(address indexed caller, uint256 newFee);

    /**
     * @notice withdraws `amoount` of a given `token` from the contract.
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
     * @notice adds a token to `_paymentTokens`.
     * can be called only from permissioned actor.
     * @param token token address
     */
    function addPaymentToken(address token) external;

    /**
     * @notice removes a token from `_paymentTokens`.
     * can be called only from permissioned actor.
     * @param token token address
     */
    function removePaymentToken(address token) external;

    /**
     * @notice sets new `_fee` value
     * can be called only from permissioned actor.
     * @param newFee token address
     */
    function setFee(uint256 newFee) external;

    /**
     * @notice returns output amount from a given amount
     * @return amountOut output amount
     */
    function getOutputAmountWithFee(
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    /**
     * @notice returns vault fee
     * @return fee fee
     */
    function getFee() external view returns (uint256);
}
