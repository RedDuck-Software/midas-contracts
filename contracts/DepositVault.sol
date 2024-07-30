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

    Counters.Counter public lastRequestId;

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
     * @param _usdReceiver address of usd tokens receiver
     * @param _feeReceiver address of fee in usd tokens receiver
     * @param _initialFee fee for initial mint
     */
    function initialize(
        address _ac,
        address _mToken,
        uint256 _minAmountToFirstDeposit,
        address _usdReceiver,
        address _feeReceiver,
        uint256 _initialFee,
        uint256 _initialLimit,
        address _mTokenDataFeed,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount
    ) external initializer {
        __ManageableVault_init(
            _ac,
            _mToken,
            _usdReceiver,
            _feeReceiver,
            _initialFee,
            _initialLimit,
            _mTokenDataFeed,
            _sanctionsList,
            _variationTolerance,
            _minAmount
        );
        minAmountToFirstDeposit = _minAmountToFirstDeposit;
    }

    /**
     * @inheritdoc IDepositVault
     * @dev transfers `tokenIn` from `msg.sender`
     * to `tokensReceiver`
     * @param tokenIn address of token to deposit.
     * @param amountToken amount of token to deposit in 10**18 decimals.
     */
    function depositInstant(address tokenIn, uint256 amountToken)
        external
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        whenNotPaused
    {
        address user = msg.sender;

        (
            uint256 tokenAmountInUsd,
            uint256 feeTokenAmount,
            uint256 amountTokenWithoutFee,
            uint256 mintAmount,,,
            uint256 tokenDecimals
        ) = _calcAndValidateDeposit(user, tokenIn, amountToken, true);

        totalDeposited[user] += tokenAmountInUsd;

        _requireAndUpdateLimit(mintAmount);

        _tokenTransferFromUser(tokenIn, tokensReceiver, amountTokenWithoutFee, tokenDecimals);

        mToken.mint(user, mintAmount);

        if (feeTokenAmount > 0)
            _tokenTransferFromUser(tokenIn, feeReceiver, feeTokenAmount, tokenDecimals);

        emit DepositInstant(
            user,
            tokenIn,
            tokenAmountInUsd,
            amountToken,
            feeTokenAmount,
            mintAmount
        );
    }

    function depositRequest(address tokenIn, uint256 amountToken)
        external
        whenNotPaused
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        returns (uint256 requestId)
    {
        address user = msg.sender;

        (
            uint256 tokenAmountInUsd,
            uint256 feeAmount,
            uint256 amountTokenWithoutFee, , ,
            uint256 tokenOutRate,
            uint256 tokenDecimals
        ) = _calcAndValidateDeposit(user, tokenIn, amountToken, false);

        _tokenTransferFromUser(tokenIn, tokensReceiver, amountTokenWithoutFee, tokenDecimals);

        if (feeAmount > 0)
            _tokenTransferFromUser(tokenIn, feeReceiver, feeAmount, tokenDecimals);

        lastRequestId.increment();
        requestId = lastRequestId.current();

        mintRequests[requestId] = Request(
            user,
            tokenIn,
            RequestStatus.Pending,
            tokenAmountInUsd,
            tokenOutRate
        );

        emit DepositRequest(
            requestId,
            user,
            tokenIn,
            tokenAmountInUsd,
            feeAmount,
            tokenOutRate
        );
    }

    function safeApproveRequest(uint256 requestId, uint256 newOutRate) external onlyVaultAdmin {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(request.status == RequestStatus.Pending, "DV: request not pending");

        _requireVariationTolerance(request.tokenOutRate, newOutRate);

        _approveRequest(request.sender, request.tokenIn, requestId, request.depositedUsdAmount, newOutRate);

        mintRequests[requestId].tokenOutRate = newOutRate;

        emit SafeApproveRequest(requestId, request.sender, newOutRate);
    }

    function approveRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(request.status == RequestStatus.Pending, "DV: request not pending");

        _approveRequest(request.sender, request.tokenIn, requestId, request.depositedUsdAmount, request.tokenOutRate);

        emit ApproveRequest(requestId, request.sender);
    }

    function rejectRequest(uint256 requestId) external onlyVaultAdmin {
        Request storage request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(request.status == RequestStatus.Pending, "DV: request not pending");

        request.status = RequestStatus.Canceled;

        emit RejectRequest(requestId, request.sender);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMinAmountToFirstDeposit(uint256 newValue) external onlyVaultAdmin {
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

    function _approveRequest(address user, address tokenIn, uint256 requestId, uint256 usdAmount, uint256 tokenRate) private {
        totalDeposited[user] += usdAmount;

        uint256 feeUsdAmount = _getFeeAmount(user, tokenIn, usdAmount, false, 0);

        uint256 amountMToken = ((usdAmount - feeUsdAmount) * (10**18)) / tokenRate;

        mToken.mint(user, amountMToken);

        mintRequests[requestId].status = RequestStatus.Processed;
    }

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

        feeTokenAmount = _truncate(_getFeeAmount(user, tokenIn, amountToken, isInstant, 0), tokenDecimals);
        amountTokenWithoutFee = amountToken - feeTokenAmount;

        uint256 feeInUsd = (feeTokenAmount * tokenInRate) / 10**18;

        (uint256 mTokenAmount, uint256 mTokenRate) = _convertUsdToMToken(tokenAmountInUsd - feeInUsd);
        mintAmount = mTokenAmount;
        tokenOutRate = mTokenRate;
        require(mintAmount > 0, "DV: invalid mint amount");
    }

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
