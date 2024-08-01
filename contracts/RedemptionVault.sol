// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IRedemptionVault.sol";
import "./interfaces/IMTbill.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

import "./access/Greenlistable.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles mTBILL redemptions
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
     * @notice min amount for fiat requests
     */
    uint256 public minFiatRedeemAmount;

    /**
     * @notice fee percent for fiat requests
     */
    uint256 public fiatAdditionalFee;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice mapping, requestId to request data
     */
    mapping(uint256 => Request) public redeemRequests;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mToken address of mTBILL token
     * @param _tokensReceiver address to which USD and mTokens will be sent
     * @param _feeReceiver address to which all fees will be sent
     * @param _instantFee fee for instant operations
     * @param _instantDailyLimit daily limit for instant operations
     * @param _mTokenDataFeed address of mToken dataFeed contract
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations
     * @param _minFiatRedeemAmount min amount for fiat requests
     * @param _fiatAdditionalFee fee percent for fiat requests
     */
    function initialize(
        address _ac,
        address _mToken,
        address _tokensReceiver,
        address _feeReceiver,
        uint256 _instantFee,
        uint256 _instantDailyLimit,
        address _mTokenDataFeed,
        address _sanctionsList,
        uint256 _minAmount,
        uint256 _minFiatRedeemAmount,
        uint256 _variationTolerance,
        uint256 _fiatAdditionalFee
    ) external initializer {
        __ManageableVault_init(
            _ac,
            _mToken,
            _tokensReceiver,
            _feeReceiver,
            _instantFee,
            _instantDailyLimit,
            _mTokenDataFeed,
            _sanctionsList,
            _variationTolerance,
            _minAmount
        );
        minFiatRedeemAmount = _minFiatRedeemAmount;
        fiatAdditionalFee = _fiatAdditionalFee;
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemInstant(address tokenOut, uint256 amountMTokenIn)
        external
        whenFnNotPaused(uint8(RedemptionVaultFunctions.INSTANT_REDEEM))
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
    {
        address user = msg.sender;

        (
            uint256 feeAmount,
            uint256 amountMTokenWithoutFee
        ) = _calcAndValidateRedeem(user, tokenOut, amountMTokenIn, true, false);

        _requireAndUpdateLimit(amountMTokenIn);

        uint256 tokenDecimals = _tokenDecimals(tokenOut);

        uint256 amountMTokenInCopy = amountMTokenIn;
        address tokenOutCopy = tokenOut;

        (uint256 amountMTokenInUsd, uint256 mTokenRate) = _convertMTokenToUsd(
            amountMTokenInCopy
        );
        (uint256 amountTokenOut, uint256 tokenOutRate) = _convertUsdToToken(
            amountMTokenInUsd,
            tokenOutCopy
        );

        _requireAndUpdateAllowance(tokenOutCopy, amountTokenOut);

        mToken.burn(user, amountMTokenWithoutFee);
        if (feeAmount > 0)
            _tokenTransferFromUser(address(mToken), feeReceiver, feeAmount, 18);

        uint256 amountTokenOutWithoutFee = _truncate(
            (amountMTokenWithoutFee * mTokenRate) / tokenOutRate,
            tokenDecimals
        );

        _tokenTransferToUser(
            tokenOutCopy,
            user,
            amountTokenOutWithoutFee,
            tokenDecimals
        );

        emit RedeemInstant(
            user,
            tokenOutCopy,
            amountMTokenInCopy,
            feeAmount,
            amountTokenOutWithoutFee
        );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemRequest(address tokenOut, uint256 amountMTokenIn)
        external
        whenFnNotPaused(uint8(RedemptionVaultFunctions.REDEEM_REQUEST))
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        returns (uint256 requestId)
    {
        require(tokenOut != MANUAL_FULLFILMENT_TOKEN, "RV: tokenOut == fiat");
        return _redeemRequest(tokenOut, amountMTokenIn);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemFiatRequest(uint256 amountMTokenIn)
        external
        whenFnNotPaused(uint8(RedemptionVaultFunctions.FIAT_REDEEM_REQUEST))
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        returns (uint256 requestId)
    {
        return _redeemRequest(MANUAL_FULLFILMENT_TOKEN, amountMTokenIn);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function approveRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = _burnAndValidateApprove(requestId);

        if (request.tokenOut != MANUAL_FULLFILMENT_TOKEN) {
            uint256 tokenDecimals = _tokenDecimals(request.tokenOut);

            uint256 amountTokenOutWithoutFee = _truncate(
                (request.amountMToken * request.mTokenRate) /
                    request.tokenOutRate,
                tokenDecimals
            );

            _tokenTransferToUser(
                request.tokenOut,
                request.sender,
                amountTokenOutWithoutFee,
                tokenDecimals
            );
        }

        emit ApproveRequest(requestId, request.sender, request.tokenOut);
    }

    /**
     * @inheritdoc IRedemptionVault
     * @dev revert if tokenOut is fiat
     */
    function safeApproveRequest(uint256 requestId, uint256 newMTokenRate)
        external
        onlyVaultAdmin
    {
        Request memory request = _burnAndValidateApprove(requestId);

        require(
            request.tokenOut != MANUAL_FULLFILMENT_TOKEN,
            "RV: tokenOut = fiat"
        );

        _requireVariationTolerance(request.mTokenRate, newMTokenRate);

        uint256 tokenDecimals = _tokenDecimals(request.tokenOut);

        uint256 amountTokenOutWithoutFee = _truncate(
            (request.amountMToken * newMTokenRate) / request.tokenOutRate,
            tokenDecimals
        );

        _tokenTransferToUser(
            request.tokenOut,
            request.sender,
            amountTokenOutWithoutFee,
            tokenDecimals
        );

        emit SafeApproveRequest(
            requestId,
            request.sender,
            request.tokenOut,
            newMTokenRate
        );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function rejectRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = redeemRequests[requestId];

        _validateRequest(request.sender, request.status);

        redeemRequests[requestId].status = RequestStatus.Canceled;

        emit RejectRequest(requestId, request.sender);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setMinFiatRedeemAmount(uint256 newValue) external onlyVaultAdmin {
        minFiatRedeemAmount = newValue;

        emit SetMinFiatRedeemAmount(msg.sender, newValue);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setFiatAdditionalFee(uint256 newFee) external onlyVaultAdmin {
        fiatAdditionalFee = newFee;

        emit SetFiatAdditionalFee(msg.sender, newFee);
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure virtual override returns (bytes32) {
        return REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @notice validates approve
     * burns amount from contract
     * sets flag Processed
     * @param requestId request id
     *
     * @return request request data
     */
    function _burnAndValidateApprove(uint256 requestId)
        internal
        returns (Request memory request)
    {
        request = redeemRequests[requestId];

        _validateRequest(request.sender, request.status);

        mToken.burn(address(this), request.amountMToken);

        redeemRequests[requestId].status = RequestStatus.Processed;
    }

    /**
     * @notice validates request
     * if exist
     * if not processed
     * @param sender sender address
     * @param status request status
     */
    function _validateRequest(address sender, RequestStatus status)
        internal
        pure
    {
        require(sender != address(0), "RV: request not exist");
        require(status == RequestStatus.Pending, "RV: request not pending");
    }

    /**
     * @notice Creating request depends on tokenOut
     * @param tokenOut tokenOut address
     * @param amountMTokenIn request status
     *
     * @return requestId request id
     */
    function _redeemRequest(address tokenOut, uint256 amountMTokenIn)
        internal
        returns (uint256 requestId)
    {
        address user = msg.sender;

        bool isFiat = tokenOut == MANUAL_FULLFILMENT_TOKEN;

        (
            uint256 feeAmount,
            uint256 amountMTokenWithoutFee
        ) = _calcAndValidateRedeem(
                user,
                tokenOut,
                amountMTokenIn,
                false,
                isFiat
            );

        uint256 tokenOutRate;
        if (!isFiat) {
            TokenConfig storage config = tokensConfig[tokenOut];
            tokenOutRate = IDataFeed(config.dataFeed).getDataInBase18();
        }

        uint256 mTokenRate = mTokenDataFeed.getDataInBase18();

        _tokenTransferFromUser(
            address(mToken),
            address(this),
            amountMTokenWithoutFee,
            18 // mToken always have 18 decimals
        );
        if (feeAmount > 0)
            _tokenTransferFromUser(address(mToken), feeReceiver, feeAmount, 18);

        lastRequestId.increment();
        requestId = lastRequestId.current();

        redeemRequests[requestId] = Request(
            user,
            tokenOut,
            RequestStatus.Pending,
            amountMTokenWithoutFee,
            mTokenRate,
            tokenOutRate
        );

        emit RedeemRequest(requestId, user, tokenOut, amountMTokenIn);
    }

    /**
     * @dev calculates tokenOut amount from USD amount
     * @param amountUsd amount of USD
     * @param tokenOut tokenOut address
     *
     * @return amountToken converted USD to tokenOut
     * @return tokenRate conversion rate
     */
    function _convertUsdToToken(uint256 amountUsd, address tokenOut)
        internal
        view
        returns (uint256 amountToken, uint256 tokenRate)
    {
        require(amountUsd > 0, "RV: amount zero");

        TokenConfig storage tokenConfig = tokensConfig[tokenOut];

        tokenRate = IDataFeed(tokenConfig.dataFeed).getDataInBase18();
        require(tokenRate > 0, "RV: rate zero");

        amountToken = (amountUsd * (10**18)) / tokenRate;
    }

    /**
     * @dev calculates USD amount from mToken amount
     * @param amountMToken amount of mToken
     *
     * @return amountUsd converted amount to USD
     * @return mTokenRate conversion rate
     */
    function _convertMTokenToUsd(uint256 amountMToken)
        internal
        view
        returns (uint256 amountUsd, uint256 mTokenRate)
    {
        require(amountMToken > 0, "RV: amount zero");

        mTokenRate = mTokenDataFeed.getDataInBase18();
        require(mTokenRate > 0, "RV: rate zero");

        amountUsd = (amountMToken * mTokenRate) / (10**18);
    }

    /**
     * @dev validate redeem and calculate fee
     * @param user user address
     * @param tokenOut tokenOut address
     * @param amountMTokenIn mToken amount
     * @param isInstant is instant operation
     * @param isFiat is fiat operation
     *
     * @return feeAmount fee amount in mToken
     * @return amountMTokenWithoutFee mToken amount without fee
     */
    function _calcAndValidateRedeem(
        address user,
        address tokenOut,
        uint256 amountMTokenIn,
        bool isInstant,
        bool isFiat
    )
        internal
        view
        returns (uint256 feeAmount, uint256 amountMTokenWithoutFee)
    {
        require(amountMTokenIn > 0, "RV: invalid amount");

        if (!isFreeFromMinAmount[user]) {
            uint256 minRedeemAmount = isFiat ? minFiatRedeemAmount : minAmount;
            require(minRedeemAmount <= amountMTokenIn, "RV: amount < min");
        }

        if (isFiat) {
            require(
                tokenOut == MANUAL_FULLFILMENT_TOKEN,
                "RV: tokenOut != fiat"
            );
        } else {
            _requireTokenExists(tokenOut);
        }

        feeAmount = _getFeeAmount(
            user,
            tokenOut,
            amountMTokenIn,
            isInstant,
            isFiat ? fiatAdditionalFee : 0
        );
        amountMTokenWithoutFee = amountMTokenIn - feeAmount;
        require(amountMTokenWithoutFee > 0, "RV: tokenOut amount zero");
    }
}
