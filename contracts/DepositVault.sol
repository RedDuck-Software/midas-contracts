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

import "./access/Greenlistable.sol";
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

    struct DepositRequest {
        address user;
        address tokenIn;
        uint256 amountUsdIn;
        uint256 fee;
    }

    /**
     * @notice minimal USD amount in EUR for first user`s deposit
     */
    uint256 public minAmountToDepositInEuro;

    /**
     * @notice EUR/USD data feed
     */
    IDataFeed public eurUsdDataFeed;

    /**
     * @dev depositor address => amount deposited
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
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTBILL address of mTBILL token
     * @param _eurUsdDataFeed address of CL`s data feed EUR/USD
     * @param _minAmountToDepositInEuro initial value for minAmountToDepositInEuro
     */
    function initialize(
        address _ac,
        address _mTBILL,
        address _eurUsdDataFeed,
        uint256 _minAmountToDepositInEuro
    ) external initializer {
        __ManageableVault_init(_ac, _mTBILL);
        minAmountToDepositInEuro = _minAmountToDepositInEuro;
        eurUsdDataFeed = IDataFeed(_eurUsdDataFeed);
    }

    /**
     * @inheritdoc IDepositVault
     * @dev transfers `tokenIn` from `msg.sender`
     * and saves deposit request to the storage
     */
    function initiateDepositRequest(address tokenIn, uint256 amountUsdIn)
        external
        onlyGreenlisted(msg.sender)
        pausable
        returns (uint256)
    {
        address user = msg.sender;

        lastRequestId.increment();
        uint256 requestId = lastRequestId.current();

        _requireTokenExists(tokenIn);
        if (!isFreeFromMinDeposit[msg.sender]) {
            _validateAmountUsdIn(user, amountUsdIn);
        }
        require(amountUsdIn > 0, "DV: invalid amount");

        uint256 fee = (amountUsdIn * getFee(tokenIn)) / (ONE_HUNDRED_PERCENT);
        uint256 amountIncludingSubtractionOfFee = amountUsdIn - fee;

        totalDeposited[user] += amountIncludingSubtractionOfFee;
        _tokenTransferFrom(msg.sender, tokenIn, amountUsdIn);

        requests[requestId] = DepositRequest(
            user,
            tokenIn,
            amountIncludingSubtractionOfFee,
            fee
        );

        emit InitiateRequest(
            requestId,
            user,
            tokenIn,
            amountIncludingSubtractionOfFee
        );
        emit FeeCollected(requestId, msg.sender, fee);

        return requestId;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function fulfillDepositRequest(uint256 requestId, uint256 amountMTbillOut)
        external
        onlyVaultAdmin
    {
        DepositRequest memory request = _getRequest(requestId);

        _fullfillDepositRequest(requestId, request.user, amountMTbillOut);
    }

    /**
     * @inheritdoc IDepositVault
     * @dev reverts existing deposit request by a given `requestId`,
     * deletes it from the storage and fires the event
     */
    function cancelDepositRequest(uint256 requestId) external onlyVaultAdmin {
        DepositRequest memory request = _getRequest(requestId);

        delete requests[requestId];

        uint256 returnAmount = request.amountUsdIn + request.fee;
        totalDeposited[request.user] -= request.amountUsdIn;

        _transferToken(request.user, request.tokenIn, returnAmount);

        emit CancelRequest(requestId);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function manuallyDeposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn,
        uint256 amountMTbillOut
    ) external onlyVaultAdmin {
        require(amountUsdIn > 0 || amountMTbillOut > 0, "DV: invalid amounts");

        _manuallyDeposit(user, tokenIn, amountUsdIn, amountMTbillOut);
    }

    /**
     * @inheritdoc IDepositVault
     */
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
     * @notice minAmountToDepositInEuro converted to USD in base18
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
     * @dev removes deposit request from the storage
     * mints `amountMTbillOut` of mTBILL to `user`
     * @param requestId id of a deposit request
     * @param user user address
     * @param amountMTbillOut amount of mTBILL that should be minted to `user`
     */
    function _fullfillDepositRequest(
        uint256 requestId,
        address user,
        uint256 amountMTbillOut
    ) internal {
        delete requests[requestId];

        mTBILL.mint(user, amountMTbillOut);

        emit FulfillRequest(msg.sender, requestId, amountMTbillOut);
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

    /**
     * @dev internal implementation of manuallyDeposit()
     * mints `amountMTbillOut` amount of mTBILL to the `user`
     * and fires the event
     * @param user user address
     * @param tokenIn address of input USD token
     * @param amountUsdIn amount of USD token taken from user
     * @param amountMTbillOut amount of mTBILL token to mint to `user`
     */
    function _manuallyDeposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn,
        uint256 amountMTbillOut
    ) internal {
        require(user != address(0), "DV: invalid user");

        if (tokenIn != MANUAL_FULLFILMENT_TOKEN) {
            _requireTokenExists(tokenIn);
        }

        mTBILL.mint(user, amountMTbillOut);

        emit PerformManualAction(
            msg.sender,
            user,
            tokenIn,
            amountMTbillOut,
            amountUsdIn
        );
    }

    /**
     * @dev checks that request is exists and copies it to the memory
     * @return request request object
     */
    function _getRequest(uint256 requestId)
        internal
        view
        returns (DepositRequest memory request)
    {
        request = requests[requestId];
        require(request.user != address(0), "DV: r not exists");
    }
}
