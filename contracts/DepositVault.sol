// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

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
    function deposit(
        address tokenIn,
        uint256 amountUsdIn
    ) external onlyGreenlisted(msg.sender) returns (uint256) {
        _requireTokenExists(tokenIn);
        _tokenTransferFrom(msg.sender, tokenIn, amountUsdIn);

        return
            _deposit(
                msg.sender,
                tokenIn,
                amountUsdIn,
                _getOutputAmountWithFee(amountUsdIn),
                false
            );
    }

    /**
     * @inheritdoc IDepositVault
     * @dev mints stUSD according to ETF data feed price
     */
    function fulfillManualDeposit(
        address user,
        uint256 amountUsdIn
    ) external onlyVaultAdmin returns (uint256) {
        return
            _deposit(
                user,
                MANUAL_FULLFILMENT_TOKEN,
                amountUsdIn,
                _getOutputAmountWithFee(amountUsdIn),
                true
            );
    }

    /**
     * @inheritdoc IDepositVault
     * @dev mints `amountStUsdOut` of stUSD
     */
    function fulfillManualDeposit(
        address user,
        uint256 amountUsdIn,
        uint256 amountStUsdOut
    ) external onlyVaultAdmin {
        _deposit(
            user,
            MANUAL_FULLFILMENT_TOKEN,
            amountUsdIn,
            amountStUsdOut,
            true
        );
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
    function getOutputAmountWithFee(
        uint256 amountUsdIn
    ) external view returns (uint256) {
        return _getOutputAmountWithFee(amountUsdIn);
    }

    /**
     * @notice minAmountToDepositInEuro in USD in base18
     */
    function minAmountToDepositInUsd() public view returns (uint256) {
        return
            (minAmountToDepositInEuro * eurUsdDataFeed.getDataInBase18()) /
            10 ** 18;
    }

    /**
     * @inheritdoc IManageableVault
     */
    function getFee() public view returns (uint256) {
        return _fee;
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @notice deposits USD `tokenIn` into vault and mints given `amountStUsdOut amount
     * @param user user address
     * @param tokenIn address of USD token in
     * @param amountUsdIn amount of `tokenIn` that should be takken from user
     * @param amountStUsdOut amount of stUSD that should be minted to user
     * @param isManuallyFilled is called from fulfillManualDeposit
     * @return mintedStUsd amount of stUSD that minted to user
     */
    function _deposit(
        address user,
        address tokenIn,
        uint256 amountUsdIn,
        uint256 amountStUsdOut,
        bool isManuallyFilled
    ) internal returns (uint256) {
        require(amountUsdIn > 0, "DV: invalid amount");

        if (!isManuallyFilled) {
            _validateAmountUsdIn(user, amountUsdIn);
            totalDeposited[user] += amountUsdIn;
        }

        require(amountStUsdOut > 0, "DV: invalid amount out");

        stUSD.mint(user, amountStUsdOut);

        emit Deposit(
            user,
            tokenIn,
            isManuallyFilled,
            amountUsdIn,
            amountStUsdOut
        );

        return amountStUsdOut;
    }

    /**
     * @dev returns how much stUSD user should receive from USD inputted
     * @param amountUsdIn amount of USD
     * @return outputStUsd amount of stUSD that should be minted to user
     */
    function _getOutputAmountWithFee(
        uint256 amountUsdIn
    ) internal view returns (uint256) {
        if (amountUsdIn == 0) return 0;

        uint256 price = etfDataFeed.getDataInBase18();
        uint256 amountOutWithoutFee = price == 0
            ? 0
            : (amountUsdIn * (10 ** 18)) / (price);
        return
            amountOutWithoutFee -
            ((amountOutWithoutFee * getFee()) / (100 * PERCENTAGE_BPS));
    }

    /**
     * @dev validates that inputted USD amount >= minAmountToDepositInUsd()
     * @param user user address
     * @param amountUsdIn amount of USD
     */
    function _validateAmountUsdIn(
        address user,
        uint256 amountUsdIn
    ) internal view {
        if (totalDeposited[user] != 0) return;
        require(
            amountUsdIn >= minAmountToDepositInUsd(),
            "DV: usd amount < min"
        );
    }
}
