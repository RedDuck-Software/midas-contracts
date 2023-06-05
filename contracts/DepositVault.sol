// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "./interfaces/IDepositVault.sol";
import "./interfaces/IStUSD.sol";
import "./interfaces/IDataFeed.sol";

import "./access/Greenlistable.sol";

contract DepositVault is Greenlistable, IDepositVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    address public constant MANUAL_FULLFILMENT_TOKEN_IN = address(0);

    uint256 public constant PERCENTAGE_BPS = 100;

    IDataFeed public etfDataFeed;

    IStUSD public stUSD;

    EnumerableSet.AddressSet private _paymentTokens;

    /// @dev _fee value with PERCENTAGE_BPS
    uint256 private _fee;

    /// @dev leaving a storage gap for futures updates
    uint256[50] private __gap;

    function initialize(
        address _ac,
        address _stUSD,
        address _etfDataFeed
    ) external initializer {
        stUSD = IStUSD(_stUSD);
        etfDataFeed = IDataFeed(_etfDataFeed);
        __Greenlistable_init(_ac);
    }

    function deposit(
        address tokenIn,
        uint256 amountUsdIn
    ) external returns (uint256) {
        _requireTokenExists(tokenIn);
        IERC20(tokenIn).safeTransferFrom(
            msg.sender,
            address(this),
            amountUsdIn
        );
        return _deposit(msg.sender, tokenIn, amountUsdIn, false);
    }

    function fulfillManualDeposit(
        address user,
        uint256 amountUsdIn
    ) external onlyRole(DEPOSIT_VAULT_ADMIN, msg.sender) returns (uint256) {
        return _deposit(user, MANUAL_FULLFILMENT_TOKEN_IN, amountUsdIn, true);
    }

    function withdraw(
        address token,
        uint256 amount,
        address withdrawTo
    ) external onlyRole(DEPOSIT_VAULT_ADMIN, msg.sender) {
        _requireTokenExists(token);
        IERC20(token).transfer(withdrawTo, amount);
        emit Withdraw(msg.sender, token, withdrawTo, amount);
    }

    function addPaymentToken(
        address token
    ) external onlyRole(DEPOSIT_VAULT_ADMIN, msg.sender) {
        require(_paymentTokens.add(token), "DP: already added");
        emit AddPaymentToken(token, msg.sender);
    }

    function removePaymentToken(
        address token
    ) external onlyRole(DEPOSIT_VAULT_ADMIN, msg.sender) {
        require(_paymentTokens.remove(token), "DP: not exists");
        emit RemovePaymentToken(token, msg.sender);
    }

    function setFee(
        uint256 newFee
    ) external onlyRole(DEPOSIT_VAULT_ADMIN, msg.sender) {
        _fee = newFee;
        emit SetFee(msg.sender, newFee);
    }

    function getOutputAmountWithFee(
        uint256 amountUsdIn
    ) external view returns (uint256) {
        return _getOutputAmountWithFee(amountUsdIn);
    }

    function fee() public view returns (uint256) {
        return _fee;
    }

    function _deposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn,
        bool isManuallyFilled
    ) internal returns (uint256 amountStUsdOut) {
        amountStUsdOut = _getOutputAmountWithFee(amountUsdIn);

        if (!isManuallyFilled) {
            _validateAmountUsdIn(amountUsdIn);
            // TODO: out amount validation
        }

        stUSD.mint(user, amountUsdIn);

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
        uint256 price = etfDataFeed.getDataInBase18();
        uint256 amountOutWithoutFee = (amountUsdIn * (10 ** 18)) / (price);
        return
            amountOutWithoutFee -
            ((amountOutWithoutFee * fee()) / PERCENTAGE_BPS);
    }

    function _validateAmountUsdIn(uint256 amountUsdIn) internal pure {
        require(amountUsdIn > 0, "DP: invalid usd amount");
    }

    function _requireTokenExists(address token) internal view {
        require(_paymentTokens.contains(token), "DP: token no exists");
    }
}
