// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IManageableVault.sol";

/**
 * @title IRedemptionVault
 * @author RedDuck Software
 */
interface IRedemptionVault is IManageableVault {
    event Redeem(
        uint256 indexed id,
        address indexed user,
        address indexed usdTokenOut,
        uint256 amount
    );

    event Fulfill(uint256 indexed id);

    /**
     * @notice Transfers mTBILL from the user to the admin.
     * After that admin should validate the redeemption and transfer
     * selected `tokenOut` back to user
     * @param tokenOut stable coin token address to redeem to
     * @param amountTBillIn amount of mTBILL to redeem
     */
    function redeem(address tokenOut, uint256 amountTBillIn) external;
}
