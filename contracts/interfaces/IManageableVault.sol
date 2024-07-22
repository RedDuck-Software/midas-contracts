// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

struct TokenConfig {
    address dataFeed;
    uint256 fee;
    uint256 allowance;
}

struct Limit {
    uint256 updateTs;
    uint256 limit;
}

/**
 * @title IManageableVault
 * @author RedDuck Software
 */
interface IManageableVault {
    /**
     * @param caller function caller (msg.sender)
     * @param token token that was withdrawn
     * @param withdrawTo address to which tokens were withdrawn
     * @param amount `token` transfer amount
     */
    event WithdrawToken(
        address indexed caller,
        address indexed token,
        address indexed withdrawTo,
        uint256 amount
    );

    /**
     * @param token address of token that
     * @param dataFeed token dataFeed address
     * @param fee fee 1% = 100
     * @param caller function caller (msg.sender)
     */
    event AddPaymentToken(
        address indexed token,
        address indexed dataFeed,
        uint256 fee,
        address indexed caller
    );

    event ChangeTokenAllowance(
        address indexed token,
        uint256 allowance,
        address indexed caller
    );

    /**
     * @param token address of token that
     * @param caller function caller (msg.sender)
     */
    event RemovePaymentToken(address indexed token, address indexed caller);

    /**
     * @param account address of account
     * @param caller function caller (msg.sender)
     */
    event AddWaivedFeeAccount(
        address indexed account,
        address indexed caller
    );
    /**
     * @param account address of account
     * @param caller function caller (msg.sender)
     */
    event RemoveWaivedFeeAccount(
        address indexed account,
        address indexed caller
    );

    /**
     * @param caller function caller (msg.sender)
     * @param newFee new operation fee value
     */
    event SetInitialFee(address indexed caller, uint256 newFee);

    /**
     * @param caller function caller (msg.sender)
     * @param newLimit new operation daily limit
     */
    event SetInitialLimit(address indexed caller, uint256 newLimit);

    /**
     * @param caller function caller (msg.sender)
     * @param reciever new reciever address
     */
    event SetFeeReceiver(address indexed caller, address indexed reciever);

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
     * @param dataFeed dataFeed address
     * @param fee 1% = 100
     */
    function addPaymentToken(
        address token,
        address dataFeed,
        uint256 fee
    ) external;

    /**
     * @notice removes a token from stablecoins list.
     * can be called only from permissioned actor.
     * @param token token address
     */
    function removePaymentToken(address token) external;

    /**
     * @notice set new reciever for fees.
     * can be called only from permissioned actor.
     * @param reciever new reciever address
     */
    function setFeeReceiver(address reciever) external;

    /**
     * @notice set operation fee percent.
     * can be called only from permissioned actor.
     * @param newInitialFee new operation fee value
     */
    function setInitialFee(uint256 newInitialFee) external;

    /**
     * @notice set operation daily limit.
     * can be called only from permissioned actor.
     * @param newInitialLimit new operation daily limit
     */
    function setInitialLimit(uint256 newInitialLimit) external;

    /**
     * @notice adds a account to waived fee restriction.
     * can be called only from permissioned actor.
     * @param account address
     */
    function addWaivedFeeAccount(
        address account
    ) external;

    /**
     * @notice removes a account from waived fee restriction.
     * can be called only from permissioned actor.
     * @param account address
     */
    function removeWaivedFeeAccount(
        address account
    ) external;
}
