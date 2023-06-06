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

    address public constant MANUAL_FULLFILMENT_TOKEN = address(0x0);

    uint256 public constant PERCENTAGE_BPS = 100;

    IDataFeed public etfDataFeed;

    IStUSD public stUSD;

    EnumerableSet.AddressSet internal _paymentTokens;

    /// @dev _fee value with PERCENTAGE_BPS
    uint256 internal _fee;

    modifier onlyVaultAdmin  {
        _onlyRole(vaultRole(), msg.sender);
        _;
    }

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
    ) external onlyRole(vaultRole(), msg.sender) {
        IERC20(token).transfer(withdrawTo, amount);
        emit WithdrawToken(msg.sender, token, withdrawTo, amount);
    }

    function addPaymentToken(
        address token
    ) external onlyRole(vaultRole(), msg.sender) {
        require(token != address(0), "MV: invalid token");
        require(_paymentTokens.add(token), "MV: already added");
        emit AddPaymentToken(token, msg.sender);
    }

    function removePaymentToken(
        address token
    ) external onlyRole(vaultRole(), msg.sender) {
        require(_paymentTokens.remove(token), "MV: not exists");
        emit RemovePaymentToken(token, msg.sender);
    }

    function setFee(uint256 newFee) external onlyRole(vaultRole(), msg.sender) {
        _fee = newFee;
        emit SetFee(msg.sender, newFee);
    }

    function getPaymentTokens() external view returns (address[] memory) {
        return _paymentTokens.values();
    }

    function vaultRole() public view virtual returns (bytes32);

    function _tokenTransferFrom(
        address user,
        address token,
        uint256 amount
    ) internal {
        IERC20(token).safeTransferFrom(
            user,
            address(this),
            amount.convertFromBase18(_tokenDecimals(token))
        );
    }

    function _tokenDecimals(address token) internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    function _requireTokenExists(address token) internal view virtual {
        require(_paymentTokens.contains(token), "MV: token not exists");
    }
}
