// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IRedemptionVault.sol";
import "./interfaces/ISTUsd.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

import "./access/Greenlistable.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles stUSD redemptions
 * @author RedDuck Software
 */
contract RedemptionVault is ManageableVault, IRedemptionVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    /**
     * @notice last redemption request id
     */
    Counters.Counter public lastRequestId;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[51] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _stUSD address of stUSD token
     * @param _tokensReceiver address of stUSD token receiver
     */
    function initialize(
        address _ac,
        address _stUSD,
        address _tokensReceiver
    ) external initializer {
        __ManageableVault_init(_ac, _stUSD, _tokensReceiver);
    }

    /**
     * @inheritdoc IRedemptionVault
     * @dev transfers 'amountSTUsdIn' amount from user
     * to `tokensReceiver`
     */
    function redeem(
        address tokenOut,
        uint256 amountSTUsdIn
    ) external onlyGreenlisted(msg.sender) whenNotPaused {
        require(amountSTUsdIn > 0, "RV: 0 amount");

        address user = msg.sender;

        lastRequestId.increment();
        uint256 requestId = lastRequestId.current();

        _requireTokenExists(tokenOut);
        _tokenTransferFromUser(address(stUSD), amountSTUsdIn);

        emit Redeem(requestId, user, tokenOut, amountSTUsdIn);
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @dev checks that provided `token` is supported by the vault
     * @param token token address
     */
    function _requireTokenExists(address token) internal view override {
        if (token == MANUAL_FULLFILMENT_TOKEN) return;
        super._requireTokenExists(token);
    }
}
