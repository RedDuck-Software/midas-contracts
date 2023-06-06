// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../interfaces/IManageableVault.sol";
import "../interfaces/IStUSD.sol";
import "../interfaces/IDataFeed.sol";

import "../access/Greenlistable.sol";

import "../libraries/DecimalsCorrectionLibrary.sol";

abstract contract ManageableVault is Greenlistable, IManageableVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant PERCENTAGE_BPS = 100;

    IDataFeed public etfDataFeed;

    IStUSD public stUSD;

    EnumerableSet.AddressSet internal _paymentTokens;

    /// @dev _fee value with PERCENTAGE_BPS
    uint256 internal _fee;

    function __ManageableVault_init(
        address _ac,
        address _stUSD,
        address _etfDataFeed
    ) internal onlyInitializing {
        stUSD = IStUSD(_stUSD);
        etfDataFeed = IDataFeed(_etfDataFeed);
        __Greenlistable_init(_ac);
    }

    function withdrawToken(
        address token,
        uint256 amount,
        address withdrawTo
    ) external onlyRole(DEPOSIT_VAULT_ADMIN_ROLE, msg.sender) {
        IERC20(token).transfer(withdrawTo, amount);
        emit WithdrawToken(msg.sender, token, withdrawTo, amount);
    }

    function addPaymentToken(
        address token
    ) external onlyRole(DEPOSIT_VAULT_ADMIN_ROLE, msg.sender) {
        require(token != address(0), "DV: invalid token");
        require(_paymentTokens.add(token), "DV: already added");
        emit AddPaymentToken(token, msg.sender);
    }

    function removePaymentToken(
        address token
    ) external onlyRole(DEPOSIT_VAULT_ADMIN_ROLE, msg.sender) {
        require(_paymentTokens.remove(token), "DV: not exists");
        emit RemovePaymentToken(token, msg.sender);
    }

    function setFee(
        uint256 newFee
    ) external onlyRole(DEPOSIT_VAULT_ADMIN_ROLE, msg.sender) {
        _fee = newFee;
        emit SetFee(msg.sender, newFee);
    }

    function getPaymentTokens() external view returns (address[] memory) {
        return _paymentTokens.values();
    }
}
