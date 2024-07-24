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
     * @notice minimal USD amount in EUR for first user`s deposit
     */
    uint256 public minAmountToDeposit;

    Counters.Counter public lastRequestId;

    mapping(uint256 => Request) public mintRequests;

    /**
     * @dev depositor address => amount deposited
     */
    mapping(address => uint256) public totalDeposited;

    /**
     * @notice users restricted from depositin minDepositAmountInEuro
     */
    mapping(address => bool) public isFreeFromMinDeposit;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mToken address of mTBILL token
     * @param _minAmountToDeposit initial value for minAmountToDeposit
     * @param _usdReceiver address of usd tokens receiver
     * @param _feeReceiver address of fee in usd tokens receiver
     * @param _initialFee fee for initial mint
     */
    function initialize(
        address _ac,
        address _mToken,
        uint256 _minAmountToDeposit,
        address _usdReceiver,
        address _feeReceiver,
        uint256 _initialFee,
        uint256 _initialLimit,
        address _mTokenDataFeed
    ) external initializer {
        __ManageableVault_init(
            _ac,
            _mToken,
            _usdReceiver,
            _feeReceiver,
            _initialFee,
            _initialLimit,
            _mTokenDataFeed
        );
        minAmountToDeposit = _minAmountToDeposit;
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
        whenNotPaused
    {
        address user = msg.sender;

        (uint256 tokenAmountInUsd, uint256 feeTokenAmount, uint256 amountTokenWithoutFee, uint256 mintAmount) = _calcAndValidateDeposit(user, tokenIn, amountToken, true);

        totalDeposited[user] += tokenAmountInUsd;

        _requireAndUpdateLimit(mintAmount);

        _tokenTransferFromUser(tokenIn, tokensReceiver, amountTokenWithoutFee);

        mToken.mint(user, mintAmount);

        if (feeTokenAmount > 0)
            _tokenTransferFromUser(tokenIn, feeReceiver, feeTokenAmount);

        emit DepositInstant(user, tokenIn, tokenAmountInUsd, amountToken, feeTokenAmount, mintAmount);
    }

    function depositRequest(address tokenIn, uint256 amountToken)
        external
        whenNotPaused
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        returns(uint256 requestId)
    {
        address user = msg.sender;

        (uint256 tokenAmountInUsd, uint256 feeAmount, uint256 amountTokenWithoutFee, uint256 mintAmount) = _calcAndValidateDeposit(user, tokenIn, amountToken, false);

        _tokenTransferFromUser(tokenIn, tokensReceiver, amountTokenWithoutFee);

        if (feeAmount > 0)
            _tokenTransferFromUser(tokenIn, feeReceiver, feeAmount);

        lastRequestId.increment();
        requestId = lastRequestId.current();

        mintRequests[requestId] = Request(user, tokenIn, tokenAmountInUsd, mintAmount);

        emit DepositRequest(requestId, user, tokenIn, tokenAmountInUsd, amountToken, feeAmount, mintAmount);
    }

    function approveRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");

        totalDeposited[request.sender] += request.depositedUsdAmount;

        mToken.mint(request.sender, request.mintAmount);

        delete mintRequests[requestId];

        emit ApproveRequest(requestId, request.sender);
    }

    function rejectRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");

        delete mintRequests[requestId];

        emit RejectRequest(requestId, request.sender);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function freeFromMinDeposit(address user) external onlyVaultAdmin {
        require(!isFreeFromMinDeposit[user], "DV: already free");

        isFreeFromMinDeposit[user] = true;

        emit FreeFromMinDeposit(user);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMinAmountToDeposit(uint256 newValue) external onlyVaultAdmin {
        minAmountToDeposit = newValue;

        emit SetMinAmountToDeposit(msg.sender, newValue);
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
        if (totalDeposited[user] != 0) return;
        require(amountUsdIn >= minAmountToDeposit, "DV: usd amount < min");
    }

    function _calcAndValidateDeposit(address user, address tokenIn, uint256 amountToken, bool isInstant) internal returns(uint256 tokenAmountInUsd, uint256 feeTokenAmount, uint256 amountTokenWithoutFee, uint256 mintAmount) {
        require(amountToken > 0, "DV: invalid amount");

        _requireTokenExists(tokenIn);

        (uint256 amountInUsd, uint256 tokenRate) = _convertTokenToUsd(tokenIn, amountToken);
        tokenAmountInUsd = amountInUsd;

        if (!isFreeFromMinDeposit[user]) {
            _validateAmountUsdIn(user, tokenAmountInUsd);
        }

        _requireAndUpdateAllowance(tokenIn, amountToken);

        feeTokenAmount = _getFeeAmount(user, tokenIn, amountToken, isInstant);
        amountTokenWithoutFee = amountToken - feeTokenAmount;

        uint256 feeInUsd = feeTokenAmount * tokenRate / 10**18;

        mintAmount = _convertUsdToMToken(tokenAmountInUsd - feeInUsd);
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

        amountInUsd = amount * rate / (10**18);
    }
    
    function _convertUsdToMToken(uint256 amountUsd)
        internal
        view
        returns (uint256)
    {
        if (amountUsd == 0) return 0;

        uint256 mTokenRate = mTokenDataFeed.getDataInBase18();
        if (mTokenRate == 0) return 0;

        return amountUsd * (10**18) / mTokenRate;
    }
}
