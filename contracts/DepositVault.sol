// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IDepositVault.sol";
import "./interfaces/IStUSD.sol";
import "./interfaces/IDataFeed.sol";

import "./access/Greenlistable.sol";
import "./abstract/ManageableVault.sol";

import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title DepositVault
 * @notice Smart contract that handles stUSD minting
 * @author RedDuck Software
 */
contract DepositVault is ManageableVault, IDepositVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    struct DepositRequest {
        address user;
        address tokenIn;
        uint256 amountUsdIn;
        uint256 fee;
        bool exists;
    }

    /**
     * @notice minimal USD deposit amount in EUR
     */
    uint256 public minAmountToDepositInEuro;

    /**
     * @notice EUR/USD data feed
     */
    IDataFeed public eurUsdDataFeed;

    /**
     * @notice depositor address => amount deposited
     */
    mapping(address => uint256) public totalDeposited;

    /**
     * @dev requestId => DepositRequest
     * @notice stores requests id for deposit requests created by user
     * deleted when request is fulfilled or cancelled by permissioned actor
     * */
    mapping(uint256 => DepositRequest) public requests;

    /**
     * @notice last deposit request id
     */
    Counters.Counter public lastRequestId;

    /**
     * @notice users restricted from depositin minDepositAmountInEuro
     */
    mapping(address => bool) public isFreeFromMinDeposit;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable patter contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _stUSD address of stUSD token
     * @param _etfDataFeed address of CL`s data feed IB01/USD
     * @param _eurUsdDataFeed address of CL`s data feed EUR/USD
     * @param _minAmountToDepositInEuro init. value for minUsdAmountToRedeem
     */
    function initialize(
        address _ac,
        address _stUSD,
        address _etfDataFeed,
        address _eurUsdDataFeed,
        uint256 _minAmountToDepositInEuro
    ) external initializer {
        __ManageableVault_init(_ac, _stUSD, _etfDataFeed);
        minAmountToDepositInEuro = _minAmountToDepositInEuro;
        eurUsdDataFeed = IDataFeed(_eurUsdDataFeed);
    }

    /**
     * @inheritdoc IDepositVault
     * @dev transfers `tokenIn` from msg.sender and mints
     * stUSD according to ETF data feed price
     */
    function initiateDepositRequest(address tokenIn, uint256 amountUsdIn)
        external
        onlyGreenlisted(msg.sender)
        pausable
        nonReentrant
        returns (uint256)
    {
        address user = msg.sender;

        lastRequestId.increment();
        uint256 requestId = lastRequestId._value;

        _requireTokenExists(tokenIn);
        if (!isFreeFromMinDeposit[msg.sender]) {
            _validateAmountUsdIn(user, amountUsdIn);
        }
        require(amountUsdIn > 0, "DV: invalid amount");

        uint256 fee = (amountUsdIn * getFee(tokenIn)) / (100 * PERCENTAGE_BPS);
        uint256 amountIncludingFee = amountUsdIn - fee;

        totalDeposited[user] += amountIncludingFee;
        _tokenTransferFrom(msg.sender, tokenIn, amountUsdIn);

        requests[requestId] = DepositRequest(
            user,
            tokenIn,
            amountIncludingFee,
            fee,
            true
        );

        emit InitiateRequest(requestId, user, tokenIn, amountIncludingFee);
        emit FeeCollected(requestId, msg.sender, fee);

        return requestId;
    }

    /**
     * @inheritdoc IDepositVault
     * @dev mints stUSD according to ETF data feed price
     */
    function fulfillDepositRequest(uint256 requestId, uint256 amountStUsdOut)
        external
        onlyVaultAdmin
    {
        DepositRequest memory request = _getRequest(requestId);

        _fullfillDepositRequest(requestId, request.user, amountStUsdOut);
    }

    /**
     * @inheritdoc IDepositVault
     * @dev deletes request by a given `requestId` from storage
     * and fires the event
     */
    function cancelDepositRequest(uint256 requestId) external onlyVaultAdmin {
        DepositRequest memory request = _getRequest(requestId);

        delete requests[requestId];

        uint256 returnAmount = request.amountUsdIn + request.fee;
        IERC20(request.tokenIn).safeTransfer(request.user, returnAmount);

        emit CancelRequest(requestId);
    }

    /**
     * @inheritdoc IDepositVault
     * @dev `tokenIn` amount is calculated using ETF data feed answer
     */
    function manuallyDeposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn
    ) external onlyVaultAdmin returns (uint256 amountStUsdOut) {
        require(amountUsdIn > 0, "DV: 0 amount");

        amountStUsdOut = _getOutputAmountWithFee(amountUsdIn, tokenIn);
        _manuallyDeposit(user, tokenIn, amountUsdIn, amountStUsdOut);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function manuallyDeposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn,
        uint256 amountStUsdOut
    ) external onlyVaultAdmin {
        require(amountUsdIn > 0 || amountStUsdOut > 0, "DV: invalid amounts");

        _manuallyDeposit(user, tokenIn, amountUsdIn, amountStUsdOut);
    }

    function freeFromMinDeposit(address user) external onlyVaultAdmin {
        require(!isFreeFromMinDeposit[user], "DV: already free");

        isFreeFromMinDeposit[user] = true;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMinAmountToDeposit(uint256 newValue) external onlyVaultAdmin {
        minAmountToDepositInEuro = newValue;

        emit SetMinAmountToDeposit(msg.sender, newValue);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function getOutputAmountWithFee(uint256 amountUsdIn, address token)
        external
        view
        returns (uint256)
    {
        return _getOutputAmountWithFee(amountUsdIn, token);
    }

    /**
     * @notice minAmountToDepositInEuro in USD in base18
     */
    function minAmountToDepositInUsd() public view returns (uint256) {
        return
            (minAmountToDepositInEuro * eurUsdDataFeed.getDataInBase18()) /
            10**18;
    }

    /**
     * @inheritdoc IManageableVault
     */
    function getFee(address token) public view returns (uint256) {
        return _feesForTokens[token];
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @notice deposits USD `tokenIn` into vault and mints given `amountStUsdOut amount
     * @param requestId id of a deposit request
     * @param user user address
     * @param amountStUsdOut amount of stUSD that should be minted to user
     */
    function _fullfillDepositRequest(
        uint256 requestId,
        address user,
        uint256 amountStUsdOut
    ) internal {
        delete requests[requestId];

        stUSD.mint(user, amountStUsdOut);

        emit FulfillRequest(msg.sender, requestId, amountStUsdOut);
    }

    /**
     * @dev returns how much stUSD user should receive from USD inputted
     * @param amountUsdIn amount of USD
     * @return outputStUsd amount of stUSD that should be minted to user
     */
    function _getOutputAmountWithFee(uint256 amountUsdIn, address token)
        internal
        view
        returns (uint256)
    {
        if (amountUsdIn == 0) return 0;

        uint256 price = etfDataFeed.getDataInBase18();
        uint256 amountOutWithoutFee = price == 0
            ? 0
            : (amountUsdIn * (10**18)) / (price);
        return
            amountOutWithoutFee -
            ((amountOutWithoutFee * getFee(token)) / (100 * PERCENTAGE_BPS));
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
        require(
            amountUsdIn >= minAmountToDepositInUsd(),
            "DV: usd amount < min"
        );
    }

    function _manuallyDeposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn,
        uint256 amountStUsdOut
    ) internal {
        require(user != address(0), "DV: invalid user");
        _requireTokenExists(tokenIn);

        _tokenTransferFrom(msg.sender, tokenIn, amountUsdIn);
        stUSD.mint(user, amountStUsdOut);

        emit PerformManualAction(
            msg.sender,
            user,
            tokenIn,
            amountStUsdOut,
            amountUsdIn
        );
    }

    /**
     * @dev checks that request is exists and copies it to memory
     * @return request request object
     */
    function _getRequest(uint256 requestId)
        internal
        view
        returns (DepositRequest memory request)
    {
        request = requests[requestId];
        require(request.exists, "DV: r not exists");
    }
}
