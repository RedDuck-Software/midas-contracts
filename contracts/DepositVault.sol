// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IDepositVault.sol";
import "./interfaces/IMTbill.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title DepositVault
 * @notice Smart contract that handles mTBILL minting
 * @author RedDuck Software
 */
contract DepositVault is ManageableVault, IDepositVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    /**
     * @notice minimal USD amount for first user`s deposit
     */
    uint256 public minAmountToFirstDeposit;

    /**
     * @notice last request id
     */
    Counters.Counter public lastRequestId;

    /**
     * @notice mapping, requestId => request data
     */
    mapping(uint256 => Request) public mintRequests;

    /**
     * @dev depositor address => amount deposited
     */
    mapping(address => uint256) public totalDeposited;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mToken address of mTBILL token
     * @param _minAmountToFirstDeposit initial value for minAmountToDeposit
     * @param _tokensReceiver address to which USD and mTokens will be sent
     * @param _feeReceiver address to which all fees will be sent
     * @param _instantFee fee for instant operations
     * @param _instantDailyLimit daily limit for instant operations
     * @param _mTokenDataFeed address of mToken dataFeed contract
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations
     */
    function initialize(
        address _ac,
        address _mToken,
        uint256 _minAmountToFirstDeposit,
        address _tokensReceiver,
        address _feeReceiver,
        uint256 _instantFee,
        uint256 _instantDailyLimit,
        address _mTokenDataFeed,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount
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
        minAmountToFirstDeposit = _minAmountToFirstDeposit;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositInstant(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId
    )
        external
        whenFnNotPaused(uint8(DepositVaultFunctions.INSTANT_MINT))
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
    {
        address user = msg.sender;

        (
            uint256 tokenAmountInUsd,
            uint256 feeTokenAmount,
            uint256 amountTokenWithoutFee,
            uint256 mintAmount,
            ,
            ,
            uint256 tokenDecimals
        ) = _calcAndValidateDeposit(user, tokenIn, amountToken, true);

        totalDeposited[user] += tokenAmountInUsd;

        _requireAndUpdateLimit(mintAmount);

        _tokenTransferFromUser(
            tokenIn,
            tokensReceiver,
            amountTokenWithoutFee,
            tokenDecimals
        );

        mToken.mint(user, mintAmount);

        if (feeTokenAmount > 0)
            _tokenTransferFromUser(
                tokenIn,
                feeReceiver,
                feeTokenAmount,
                tokenDecimals
            );

        bytes32 referrerIdCopy = referrerId;
        uint256 amountTokenCopy = amountToken;

        emit DepositInstant(
            user,
            tokenIn,
            tokenAmountInUsd,
            amountTokenCopy,
            feeTokenAmount,
            mintAmount,
            referrerIdCopy
        );
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositRequest(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId
    )
        external
        whenFnNotPaused(uint8(DepositVaultFunctions.MINT_REQUEST))
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        returns (uint256 requestId)
    {
        address user = msg.sender;

        address tokenInCopy = tokenIn;
        uint256 amountTokenCopy = amountToken;
        bytes32 referrerIdCopy = referrerId;

        (
            uint256 tokenAmountInUsd,
            uint256 feeAmount,
            uint256 amountTokenWithoutFee,
            ,
            ,
            uint256 tokenOutRate,
            uint256 tokenDecimals
        ) = _calcAndValidateDeposit(user, tokenInCopy, amountTokenCopy, false);

        _tokenTransferFromUser(
            tokenInCopy,
            tokensReceiver,
            amountTokenWithoutFee,
            tokenDecimals
        );

        if (feeAmount > 0)
            _tokenTransferFromUser(
                tokenInCopy,
                feeReceiver,
                feeAmount,
                tokenDecimals
            );

        lastRequestId.increment();
        uint256 newRequestId = lastRequestId.current();
        requestId = newRequestId;

        mintRequests[newRequestId] = Request(
            user,
            tokenInCopy,
            RequestStatus.Pending,
            tokenAmountInUsd,
            tokenOutRate
        );

        emit DepositRequest(
            newRequestId,
            user,
            tokenInCopy,
            tokenAmountInUsd,
            feeAmount,
            tokenOutRate,
            referrerIdCopy
        );
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeApproveRequest(uint256 requestId, uint256 newOutRate)
        external
        onlyVaultAdmin
    {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(
            request.status == RequestStatus.Pending,
            "DV: request not pending"
        );

        _requireVariationTolerance(request.tokenOutRate, newOutRate);

        _approveRequest(
            request.sender,
            request.tokenIn,
            requestId,
            request.depositedUsdAmount,
            newOutRate
        );

        mintRequests[requestId].tokenOutRate = newOutRate;

        emit SafeApproveRequest(requestId, request.sender, newOutRate);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function approveRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(
            request.status == RequestStatus.Pending,
            "DV: request not pending"
        );

        _approveRequest(
            request.sender,
            request.tokenIn,
            requestId,
            request.depositedUsdAmount,
            request.tokenOutRate
        );

        emit ApproveRequest(requestId, request.sender);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function rejectRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(
            request.status == RequestStatus.Pending,
            "DV: request not pending"
        );

        mintRequests[requestId].status = RequestStatus.Canceled;

        emit RejectRequest(requestId, request.sender);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMinAmountToFirstDeposit(uint256 newValue)
        external
        onlyVaultAdmin
    {
        minAmountToFirstDeposit = newValue;

        emit SetMinAmountToFirstDeposit(msg.sender, newValue);
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure virtual override returns (bytes32) {
        return DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @dev validates that inputted USD amount >= minAmountToDepositInUsd()
     * and amount >= minAmount()
     * @param user user address
     * @param amountUsdIn amount of USD
     */
    function _validateAmountUsdIn(address user, uint256 amountUsdIn)
        internal
        view
    {
        require(amountUsdIn >= minAmount, "DV: usd amount < min");

        if (totalDeposited[user] != 0) return;

        require(amountUsdIn >= minAmountToFirstDeposit, "DV: usd amount < min");
    }

    /**
     * @dev calculates mToken amount, mints to user and sets Processed flag
     * @param user user address
     * @param tokenIn tokenIn address
     * @param requestId requestId
     * @param usdAmount amount of USD, tokenIn -> USD
     * @param tokenRate mToken rate
     */
    function _approveRequest(
        address user,
        address tokenIn,
        uint256 requestId,
        uint256 usdAmount,
        uint256 tokenRate
    ) private {
        totalDeposited[user] += usdAmount;

        uint256 feeUsdAmount = _getFeeAmount(
            user,
            tokenIn,
            usdAmount,
            false,
            0
        );

        uint256 amountMToken = ((usdAmount - feeUsdAmount) * (10**18)) /
            tokenRate;

        mToken.mint(user, amountMToken);

        mintRequests[requestId].status = RequestStatus.Processed;
    }

    /**
     * @dev validate deposit and calculate mint amount
     * @param user user address
     * @param tokenIn tokenIn address
     * @param amountToken tokenIn amount
     * @param isInstant is instant operation
     *
     * @return tokenAmountInUsd tokenIn amount converted to USD
     * @return feeTokenAmount fee amount in tokenIn
     * @return amountTokenWithoutFee tokenIn amount without fee
     * @return mintAmount mToken amount for mint
     * @return tokenInRate tokenIn rate
     * @return tokenOutRate mToken rate
     * @return tokenDecimals tokenIn decimals
     */
    function _calcAndValidateDeposit(
        address user,
        address tokenIn,
        uint256 amountToken,
        bool isInstant
    )
        internal
        returns (
            uint256 tokenAmountInUsd,
            uint256 feeTokenAmount,
            uint256 amountTokenWithoutFee,
            uint256 mintAmount,
            uint256 tokenInRate,
            uint256 tokenOutRate,
            uint256 tokenDecimals
        )
    {
        require(amountToken > 0, "DV: invalid amount");

        tokenDecimals = _tokenDecimals(tokenIn);

        _requireTokenExists(tokenIn);

        (uint256 amountInUsd, uint256 tokenInUSDRate) = _convertTokenToUsd(
            tokenIn,
            amountToken
        );
        tokenAmountInUsd = amountInUsd;
        tokenInRate = tokenInUSDRate;

        if (!isFreeFromMinAmount[user]) {
            _validateAmountUsdIn(user, tokenAmountInUsd);
        }

        _requireAndUpdateAllowance(tokenIn, amountToken);

        feeTokenAmount = _truncate(
            _getFeeAmount(user, tokenIn, amountToken, isInstant, 0),
            tokenDecimals
        );
        amountTokenWithoutFee = amountToken - feeTokenAmount;

        uint256 feeInUsd = (feeTokenAmount * tokenInRate) / 10**18;

        (uint256 mTokenAmount, uint256 mTokenRate) = _convertUsdToMToken(
            tokenAmountInUsd - feeInUsd
        );
        mintAmount = mTokenAmount;
        tokenOutRate = mTokenRate;
        require(mintAmount > 0, "DV: invalid mint amount");
    }

    /**
     * @dev calculates USD amount from tokenIn amount
     * @param tokenIn tokenIn address
     * @param amount amount of tokenIn
     *
     * @return amountInUsd converted amount to USD
     * @return rate conversion rate
     */
    function _convertTokenToUsd(address tokenIn, uint256 amount)
        internal
        view
        returns (uint256 amountInUsd, uint256 rate)
    {
        require(amount > 0, "DV: amount zero");

        TokenConfig storage tokenConfig = tokensConfig[tokenIn];

        rate = IDataFeed(tokenConfig.dataFeed).getDataInBase18();
        require(rate > 0, "DV: rate zero");

        amountInUsd = (amount * rate) / (10**18);
    }

    /**
     * @dev calculates mToken amount from USD amount
     * @param amountUsd amount of USD
     *
     * @return amountMToken converted USD to mToken
     * @return mTokenRate conversion rate
     */
    function _convertUsdToMToken(uint256 amountUsd)
        internal
        view
        returns (uint256 amountMToken, uint256 mTokenRate)
    {
        require(amountUsd > 0, "DV: amount zero");

        mTokenRate = mTokenDataFeed.getDataInBase18();
        require(mTokenRate > 0, "DV: rate zero");

        amountMToken = (amountUsd * (10**18)) / mTokenRate;
    }
}
