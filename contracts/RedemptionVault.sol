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

/**
 * @title RedemptionVault
 * @notice Smart contract that handles stUSD redemptions
 * @author RedDuck Software
 */
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

    /**
     * @dev requestId => RedemptionRequest
     * @notice stores requests id for redemption requests created by user
     * deleted when request is fulfilled or cancelled by permissioned actor
     * */
    mapping(uint256 => RedemptionRequest) public requests;

    /**
     * @notice counter for request ids
     */
    uint256 public lastRequestId;

    /**
     * @notice min. amount of USD that should be redeemed from stUSD
     * @dev min. amount should be validated only in request initiation
     */
    uint256 public minUsdAmountToRedeem;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[51] private __gap;

    /**
     * @notice upgradeable patter contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _stUSD address of stUSD token
     * @param _etfDataFeed address of CL`s data feed IB01/USD
     * @param _minUsdAmountToRedeem init. value for minUsdAmountToRedeem
     */
    function initialize(
        address _ac,
        address _stUSD,
        address _etfDataFeed,
        uint256 _minUsdAmountToRedeem
    ) external initializer {
        __ManageableVault_init(_ac, _stUSD, _etfDataFeed);
        minUsdAmountToRedeem = _minUsdAmountToRedeem;
    }

    /**
     * @inheritdoc IRedemptionVault
     * @dev burns 'amountStUsdIn' amount from user
     * and saves redemption request to the storage
     */
    function initiateRedemptionRequest(
        address tokenOut,
        uint256 amountStUsdIn
    ) external onlyGreenlisted(msg.sender) returns (uint256 requestId) {
        _requireTokenExists(tokenOut);

        require(amountStUsdIn > 0, "RV: 0 amount");

        address user = msg.sender;

        // // estimate out amount and validate that it`s >= min allowed
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

    /**
     * @inheritdoc IRedemptionVault
     * @dev deletes request by a given `requestId` from storage,
     * transfers `amountUsdOut` to user. USD token balance of the vault
     * should be sufficient to make the transfer
     */
    function fulfillRedemptionRequest(
        uint256 requestId,
        uint256 amountUsdOut
    ) external onlyVaultAdmin {
        RedemptionRequest memory request = _getRequest(requestId);
        _fulfillRedemptionRequest(request, requestId, amountUsdOut);
    }

    /**
     * @inheritdoc IRedemptionVault
     * @dev deletes request by a given `requestId` from storage
     * and fires the event
     */
    function cancelRedemptionRequest(
        uint256 requestId
    ) external onlyVaultAdmin {
        RedemptionRequest memory request = _getRequest(requestId);
        delete requests[requestId];
        stUSD.mint(request.user, request.amountStUsdIn);
        emit CancelRedemptionRequest(requestId);
    }

    /**
     * @inheritdoc IRedemptionVault
     * @dev `tokenOut` amount is calculated using ETF data feed answer
     */
    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn
    ) external onlyVaultAdmin returns (uint256 amountUsdOut) {
        require(amountStUsdIn > 0, "RV: 0 amount");
        amountUsdOut = _getOutputAmountWithFee(amountStUsdIn);
        _manuallyRedeem(user, tokenOut, amountStUsdIn, amountUsdOut);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function manuallyRedeem(
        address user,
        address tokenOut,
        uint256 amountStUsdIn,
        uint256 amountUsdOut
    ) external onlyVaultAdmin {
        require(amountStUsdIn > 0 || amountUsdOut > 0, "RV: invalid amounts");
        _manuallyRedeem(user, tokenOut, amountStUsdIn, amountUsdOut);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setMinAmountToRedeem(uint256 newValue) external {
        minUsdAmountToRedeem = newValue;
        emit SetMinAmountToRedeem(msg.sender, newValue);
    }

    /**
     * @inheritdoc IManageableVault
     * @notice returns output USD amount from a given stUSD amount
     * @return amountOut output USD amount
     */
    function getOutputAmountWithFee(
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        return _getOutputAmountWithFee(amountIn);
    }

    /**
     * @inheritdoc IManageableVault
     * @notice returns redemption fee
     * @dev fee applies to output USD amount
     * @return fee USD fee
     */
    function getFee() public view returns (uint256) {
        return _fee;
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @dev checks that request is exists and copies it to memory
     * @return request request object
     */
    function _getRequest(
        uint256 requestId
    ) internal view returns (RedemptionRequest memory request) {
        request = requests[requestId];
        require(request.exists, "RV: r not exists");
    }

    /**
     * @dev deletes request from storage, transfers USD token to user
     * and fires the event
     * @param request request object
     * @param requestId id of the request object
     * @param amountUsdOut amount of USD token to transfer to user
     */
    function _fulfillRedemptionRequest(
        RedemptionRequest memory request,
        uint256 requestId,
        uint256 amountUsdOut
    ) internal {
        delete requests[requestId];

        _transferToken(request.user, request.tokenOut, amountUsdOut);

        emit FulfillRedeemptionRequest(msg.sender, requestId, amountUsdOut);
    }

    /**
     * @dev burn `amountStUsdIn` amount of stUSd from `user`
     * and transfers `amountUsdOut` amount of `tokenOut` to `user`
     * @param user user address
     * @param tokenOut address of output USD token
     * @param amountUsdOut amount of USD token to transfer to `user`
     * @param amountStUsdIn amount of stUSD token to burn from `user`
     */
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

    /**
     * @dev do safe transfer on a given token. Doesnt perform transfer if
     * token is `MANUAL_FULLFILMENT_TOKEN` as it should be transfered off-chain
     * @param user user address
     * @param token address of token
     * @param amount amount of `token` to transfer to `user`
     */
    function _transferToken(
        address user,
        address token,
        uint256 amount
    ) internal {
        // MANUAL_FULLFILMENT_TOKEN should be transfered off-chain to user`s bank account
        if (token == MANUAL_FULLFILMENT_TOKEN) return;

        IERC20(token).safeTransfer(
            user,
            amount.convertFromBase18(_tokenDecimals(token))
        );
    }

    /**
     * @dev calculates output USD amount based on ETF data feed answer
     * @param amountStUsdIn amount of stUSD token
     * @return amountUsdOut amount with fee of output USD token
     */
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

    /**
     * @dev validates that provided `amount` is >= `minUsdAmountToRedeem`
     * @param amount amount of USD token
     */
    function _validateAmountUsdOut(uint256 amount) internal view {
        require(amount >= minUsdAmountToRedeem, "RV: amount < min");
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
