// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "./interfaces/IRedemptionVault.sol";
import "./interfaces/IStUSD.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

import "./access/Greenlistable.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

contract RedemptionVault is ManageableVault, IRedemptionVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    address public constant MANUAL_FULLFILMENT_TOKEN_OUT = address(0);

    uint256 public minUsdAmountToRedeem;

    /// @dev leaving a storage gap for futures updates
    uint256[50] private __gap;

    function initialize(
        address _ac,
        address _stUSD,
        address _etfDataFeed,
        uint256 _minUsdAmountToRedeem
    ) external initializer {
        __ManageableVault_init(_ac, _stUSD, _etfDataFeed);
        minUsdAmountToRedeem = _minUsdAmountToRedeem;
    }

    function initiateRedemptionRequest(
        address tokenOut,
        uint256 amountStUsdIn
    ) external returns (uint256 requestId) {}

    function fulfillRedemptionRequest(
        uint256 requestId
    ) external returns (uint256 amountUsdOut) {}

    function cancelRedemptionRequest(uint256 requestId) external {}

    function cancelRedemptionRequest(
        uint256 requestId,
        bytes32 reasone
    ) external {}

    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn
    ) external {}

    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn,
        uint256 amoutUsdOut
    ) external {}

    function depositToken(address token, uint256 amount) external {}

    function setMinAmountToRedeem(uint256 newValue) external {
        minUsdAmountToRedeem = newValue;
        emit SetMinAmountToRedeem(msg.sender, newValue);
    }

    function getOutputAmountWithFee(
        uint256 amountIn
    ) external view returns (uint256 amountOut) {}

    function getFee() external view returns (uint256) {}
}
