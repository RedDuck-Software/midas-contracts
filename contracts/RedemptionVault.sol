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

    struct RedemptionRequest {
        address user;
        address tokenOut;
        uint256 amountStUsdIn;
        bool exists;
    }

    mapping(uint256 => RedemptionRequest) public requests;

    uint256 public lastRequestId;

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
    ) external onlyGreenlisted(msg.sender) returns (uint256 requestId) {
        _requireTokenExists(tokenOut);

        require(amountStUsdIn > 0, "RV: 0 amount");

        address user = msg.sender;

        // estimate out amount and validate that it`s >= min allowed
        _validateAmountUsdOut(_getOutputAmountWithFee(amountStUsdIn));

        stUSD.burn(user, amountStUsdIn);

        requestId = lastRequestId++;
        requests[requestId] = RedemptionRequest({
            user: user,
            tokenOut: tokenOut,
            amountStUsdIn: amountStUsdIn,
            exists: true
        });

        emit InitiateRedeemptionRequest(
            requestId,
            user,
            tokenOut,
            amountStUsdIn
        );
    }

    function fulfillRedemptionRequest(
        uint256 requestId
    ) external onlyVaultAdmin returns (uint256 amountUsdOut) {
        RedemptionRequest memory request = _getRequest(requestId);
        amountUsdOut = _getOutputAmountWithFee(request.amountStUsdIn);
        _fulfillRedemptionRequest(request, requestId, amountUsdOut);
    }

    function fulfillRedemptionRequest(
        uint256 requestId,
        uint256 amountUsdOut
    ) external onlyVaultAdmin {
        RedemptionRequest memory request = _getRequest(requestId);
        _fulfillRedemptionRequest(request, requestId, amountUsdOut);
    }

    function cancelRedemptionRequest(
        uint256 requestId
    ) external onlyVaultAdmin {
        RedemptionRequest memory request = _getRequest(requestId);
        delete requests[requestId];
        stUSD.mint(request.user, request.amountStUsdIn);
        emit CancelRedemptionRequest(requestId);
    }

    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn
    ) external onlyVaultAdmin returns (uint256 amountUsdOut) {
        require(amountStUsdIn > 0, "RV: 0 amount");
        amountUsdOut = _getOutputAmountWithFee(amountStUsdIn);
        _manuallyRedeem(user, tokenOut, amountStUsdIn, amountUsdOut);
    }

    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn,
        uint256 amountUsdOut
    ) external onlyVaultAdmin {
        require(amountStUsdIn > 0 || amountUsdOut > 0, "RV: invalid amounts");
        _manuallyRedeem(user, tokenOut, amountStUsdIn, amountUsdOut);
    }

    function setMinAmountToRedeem(uint256 newValue) external {
        minUsdAmountToRedeem = newValue;
        emit SetMinAmountToRedeem(msg.sender, newValue);
    }

    function getOutputAmountWithFee(
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        return _getOutputAmountWithFee(amountIn);
    }

    function getFee() public view returns (uint256) {
        return _fee;
    }

    function vaultRole() public pure override returns (bytes32) {
        return REDEMPTION_VAULT_ADMIN_ROLE;
    }

    function _getRequest(
        uint256 requestId
    ) internal view returns (RedemptionRequest memory request) {
        request = requests[requestId];
        require(request.exists, "RV: r not exists");
    }

    function _fulfillRedemptionRequest(
        RedemptionRequest memory request,
        uint256 requestId,
        uint256 amountUsdOut
    ) internal {
        delete requests[requestId];

        _transferToken(request.user, request.tokenOut, amountUsdOut);

        emit FulfillRedeemptionRequest(msg.sender, requestId, amountUsdOut);
    }

    function _manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn,
        uint256 amountUsdOut
    ) internal {
        require(user != address(0), "RV: invalid user");

        _requireTokenExists(tokenOut);
        stUSD.burn(user, amountStUsdIn);
        _transferToken(user, tokenOut, amountUsdOut);

        emit ManuallyRedeem(
            msg.sender,
            user,
            tokenOut,
            amountStUsdIn,
            amountUsdOut
        );
    }

    function _transferToken(
        address user,
        address token,
        uint256 amount
    ) internal {
        if (token == MANUAL_FULLFILMENT_TOKEN) return;

        IERC20(token).safeTransfer(
            user,
            amount.convertFromBase18(_tokenDecimals(token))
        );
    }

    function _getOutputAmountWithFee(
        uint256 amountStUsdIn
    ) internal view returns (uint256) {
        if (amountStUsdIn == 0) return 0;

        uint256 price = etfDataFeed.getDataInBase18();
        uint256 amountOutWithoutFee = price == 0
            ? 0
            : (amountStUsdIn * price) / (10 ** 18);
        return
            amountOutWithoutFee -
            ((amountOutWithoutFee * getFee()) / (100 * PERCENTAGE_BPS));
    }

    function _validateAmountUsdOut(uint256 amount) internal view {
        require(amount >= minUsdAmountToRedeem, "RV: amount < min");
    }

    function _requireTokenExists(address token) internal view override {
        if (token == MANUAL_FULLFILMENT_TOKEN) return;
        super._requireTokenExists(token);
    }
}
