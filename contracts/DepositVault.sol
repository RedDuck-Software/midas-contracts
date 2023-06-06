// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "./interfaces/IDepositVault.sol";
import "./interfaces/IStUSD.sol";
import "./interfaces/IDataFeed.sol";

import "./access/Greenlistable.sol";

import "./libraries/DecimalsCorrectionLibrary.sol";

contract DepositVault is Greenlistable, IDepositVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    address public constant MANUAL_FULLFILMENT_TOKEN_IN = address(0);

    uint256 public constant PERCENTAGE_BPS = 100;

    IDataFeed public etfDataFeed;

    IStUSD public stUSD;

    uint256 public minUsdAmountToDeposit;

    EnumerableSet.AddressSet private _paymentTokens;

    /// @dev _fee value with PERCENTAGE_BPS
    uint256 private _fee;

    /// @dev leaving a storage gap for futures updates
    uint256[50] private __gap;

    function initialize(
        address _ac,
        address _stUSD,
        address _etfDataFeed,
        uint256 _minUsdAmountToDeposit
    ) external initializer {
        stUSD = IStUSD(_stUSD);
        etfDataFeed = IDataFeed(_etfDataFeed);
        minUsdAmountToDeposit = _minUsdAmountToDeposit;
        __Greenlistable_init(_ac);
    }

    function deposit(
        address tokenIn,
        uint256 amountUsdIn
    ) external onlyGreenlisted(msg.sender) returns (uint256) {
        _requireTokenExists(tokenIn);
        IERC20(tokenIn).safeTransferFrom(
            msg.sender,
            address(this),
            amountUsdIn.convertFromBase18(IERC20Metadata(tokenIn).decimals())
        );
        return _deposit(msg.sender, tokenIn, amountUsdIn, false);
    }

    function fulfillManualDeposit(
        address user,
        uint256 amountUsdIn
    )
        external
        onlyRole(DEPOSIT_VAULT_ADMIN_ROLE, msg.sender)
        returns (uint256)
    {
        return _deposit(user, MANUAL_FULLFILMENT_TOKEN_IN, amountUsdIn, true);
    }

    function withdraw(
        address token,
        uint256 amount,
        address withdrawTo
    ) external onlyRole(DEPOSIT_VAULT_ADMIN_ROLE, msg.sender) {
        IERC20(token).transfer(withdrawTo, amount);
        emit Withdraw(msg.sender, token, withdrawTo, amount);
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

    function setMinAmountToDeposit(
        uint256 newValue
    ) external onlyRole(DEPOSIT_VAULT_ADMIN_ROLE, msg.sender) {
        minUsdAmountToDeposit = newValue;
        emit SetMinAmountToDeposit(msg.sender, newValue);
    }

    function setFee(
        uint256 newFee
    ) external onlyRole(DEPOSIT_VAULT_ADMIN_ROLE, msg.sender) {
        _fee = newFee;
        emit SetFee(msg.sender, newFee);
    }

    function getOutputAmountWithFee(
        uint256 amountUsdIn
    ) external view returns (uint256) {
        return _getOutputAmountWithFee(amountUsdIn);
    }

    function getPaymentTokens() external view returns (address[] memory) {
        return _paymentTokens.values();
    }

    function getFee() public view returns (uint256) {
        return _fee;
    }

    function _deposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn,
        bool isManuallyFilled
    ) internal returns (uint256 amountStUsdOut) {
        require(amountUsdIn > 0, "DV: invalid amount");
        
        if (!isManuallyFilled) {
            _validateAmountUsdIn(amountUsdIn);
        }

        amountStUsdOut = _getOutputAmountWithFee(amountUsdIn);
        require(amountStUsdOut > 0, "DV: invalid amount out");

        stUSD.mint(user, amountStUsdOut);

        emit Deposit(
            user,
            tokenIn,
            isManuallyFilled,
            amountUsdIn,
            amountStUsdOut
        );
    }

    function _getOutputAmountWithFee(
        uint256 amountUsdIn
    ) internal view returns (uint256) {
        if(amountUsdIn == 0) return 0;

        uint256 price = etfDataFeed.getDataInBase18();
        uint256 amountOutWithoutFee = price == 0 ? 0 : (amountUsdIn * (10 ** 18)) / (price);
        return
            amountOutWithoutFee -
            ((amountOutWithoutFee * getFee()) / (100 * PERCENTAGE_BPS));
    }

    function _validateAmountUsdIn(uint256 amountUsdIn) internal view {
        require(amountUsdIn > minUsdAmountToDeposit, "DV: usd amount < min");
    }

    function _requireTokenExists(address token) internal view {
        require(_paymentTokens.contains(token), "DV: token no exists");
    }
}
