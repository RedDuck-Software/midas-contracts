// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IDepositVault.sol";
import "./interfaces/IMTbill.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

/**
 * @title DepositVault
 * @notice Smart contract that handles mTBILL minting
 * @author RedDuck Software
 */
contract DepositVault is ManageableVault, IDepositVault {
    using Counters for Counters.Counter;

    /**
     * @notice minimal USD amount for first user`s deposit
     */
    uint256 public minMTokenAmountForFirstDeposit;

    /**
     * @notice mapping, requestId => request data
     */
    mapping(uint256 => Request) public mintRequests;

    /**
     * @dev depositor address => amount minted
     */
    mapping(address => uint256) public totalMinted;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mToken address of mTBILL token
     * @param _minMTokenAmountForFirstDeposit initial value for minMTokenAmountForFirstDeposit
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
        uint256 _minMTokenAmountForFirstDeposit,
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
        minMTokenAmountForFirstDeposit = _minMTokenAmountForFirstDeposit;
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
        whenFnNotPaused(this.depositInstant.selector)
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

        totalMinted[user] += mintAmount;

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
        whenFnNotPaused(this.depositRequest.selector)
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        returns (uint256)
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

        uint256 requestId = lastRequestId.current();
        lastRequestId.increment();

        mintRequests[requestId] = Request({
            sender: user,
            tokenIn: tokenInCopy,
            status: RequestStatus.Pending,
            depositedUsdAmount: tokenAmountInUsd,
            tokenOutRate: tokenOutRate
        });

        emit DepositRequest(
            requestId,
            user,
            tokenInCopy,
            tokenAmountInUsd,
            feeAmount,
            tokenOutRate,
            referrerIdCopy
        );

        return requestId;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeApproveRequest(uint256 requestId, uint256 newOutRate)
        external
        onlyVaultAdmin
    {
        _approveRequest(requestId, newOutRate, true);

        emit SafeApproveRequest(requestId, newOutRate);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function approveRequest(uint256 requestId, uint256 newOutRate) external onlyVaultAdmin {
        _approveRequest(requestId, newOutRate, false);

        emit ApproveRequest(requestId, newOutRate);
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
    function setMinMTokenAmountForFirstDeposit(uint256 newValue)
        external
        onlyVaultAdmin
    {
        minMTokenAmountForFirstDeposit = newValue;

        emit SetMinMTokenAmountForFirstDeposit(msg.sender, newValue);
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
    function _validateMinAmount(address user, uint256 amountUsdIn, uint256 amountMTokenWithoutFee)
        internal
        view
    {
        require(amountUsdIn >= minAmount, "DV: usd amount < min");

        if (totalMinted[user] != 0) return;

        require(amountMTokenWithoutFee >= minMTokenAmountForFirstDeposit, "DV: mint amount < min");
    }

    /**
     * @dev approving request
     * Checks price diviation if safe
     * Mints mTokens to user
     * @param requestId request id
     * @param newOutRate mToken rate
     */
    function _approveRequest(
        uint256 requestId, uint256 newOutRate, bool isSafe
    ) private {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(
            request.status == RequestStatus.Pending,
            "DV: request not pending"
        );

        if(isSafe) _requireVariationTolerance(request.tokenOutRate, newOutRate);

        uint256 feeUsdAmount = _getFeeAmount(
            request.sender,
            request.tokenIn,
            request.depositedUsdAmount,
            false,
            0
        );

        uint256 amountMToken = ((request.depositedUsdAmount - feeUsdAmount) * (10**18)) /
            newOutRate;

        mToken.mint(request.sender, amountMToken);

        totalMinted[request.sender] += amountMToken;

        request.status = RequestStatus.Processed;
        request.tokenOutRate = newOutRate;
        mintRequests[requestId] = request;
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
        address userCopy = user;

        _requireAndUpdateAllowance(tokenIn, amountToken);

        feeTokenAmount = _truncate(
            _getFeeAmount(userCopy, tokenIn, amountToken, isInstant, 0),
            tokenDecimals
        );
        amountTokenWithoutFee = amountToken - feeTokenAmount;

        uint256 feeInUsd = (feeTokenAmount * tokenInRate) / 10**18;

        (uint256 mTokenAmount, uint256 mTokenRate) = _convertUsdToMToken(
            tokenAmountInUsd - feeInUsd
        );
        mintAmount = mTokenAmount;
        tokenOutRate = mTokenRate;

        if (!isFreeFromMinAmount[userCopy]) {
            _validateMinAmount(userCopy, tokenAmountInUsd, mintAmount);
        }
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
