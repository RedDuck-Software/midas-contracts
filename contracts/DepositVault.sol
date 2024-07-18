// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

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

    /**
     * @notice minimal USD amount in EUR for first user`s deposit
     */
    uint256 public minAmountToDeposit;

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
     * @param _mTBILL address of mTBILL token
     * @param _minAmountToDeposit initial value for minAmountToDeposit
     * @param _usdReceiver address of usd tokens receiver
     * @param _feeReciever address of fee in usd tokens receiver
     * @param _initialFee fee for initial mint
     */
    function initialize(
        address _ac,
        address _mTBILL,
        uint256 _minAmountToDeposit,
        address _usdReceiver,
        address _feeReciever,
        uint256 _initialFee
    ) external initializer {
        __ManageableVault_init(
            _ac,
            _mTBILL,
            _usdReceiver,
            _feeReciever,
            _initialFee
        );
        minAmountToDeposit = _minAmountToDeposit;
    }

    /**
     * @inheritdoc IDepositVault
     * @dev transfers `tokenIn` from `msg.sender`
     * to `tokensReceiver`
     * @param tokenIn address of token to deposit.
     * @param amountUsdIn amount of token to deposit in 10**18 decimals.
     */
    function depositInitial(address tokenIn, uint256 amountUsdIn)
        external
        whenNotPaused
    {
        require(amountUsdIn > 0, "DV: invalid amount");
        address user = msg.sender;

        _requireTokenExists(tokenIn);

        if (!isFreeFromMinDeposit[user]) {
            _validateAmountUsdIn(user, amountUsdIn);
        }

        uint256 feeAmount = _getFeeAmount(tokenIn, amountUsdIn);
        uint256 amountUsdWithoutFee = amountUsdIn - feeAmount;

        uint256 mintAmount = _getConvertedAmount(tokenIn, amountUsdWithoutFee);
        require(mintAmount > 0, "DV: invalid mint amount");

        totalDeposited[user] += amountUsdWithoutFee;
        _tokenTransferFromUser(tokenIn, tokensReceiver, amountUsdWithoutFee);

        mTBILL.mint(user, mintAmount);

        if (feeAmount > 0)
            _tokenTransferFromUser(tokenIn, feeReciever, feeAmount);

        emit Deposit(user, tokenIn, amountUsdIn, feeAmount, mintAmount);
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

    /**
     * @dev returns how much mtBill user should receive from USD inputted
     * @param tokenIn token address
     * @param amountUsdIn amount of USD
     * @return fee amount of input token
     */
    function _getFeeAmount(address tokenIn, uint256 amountUsdIn)
        internal
        view
        returns (uint256)
    {
        if (amountUsdIn == 0) return 0;

        TokenConfig memory tokenConfig = _tokensConfig[tokenIn];
        require(
            tokenConfig.dataFeed != address(0),
            "DV: token config not exist"
        );

        uint256 feePercent = initialFee + tokenConfig.fee;

        return (amountUsdIn * feePercent) / ONE_HUNDRED_PERCENT;
    }

    /**
     * @dev returns how much mTBill user should receive from USD inputted
     * @param tokenIn token address
     * @param amountUsd amount of USD
     * @return converted amount of tokenIn to mTBILL
     */
    function _getConvertedAmount(address tokenIn, uint256 amountUsd)
        internal
        view
        returns (uint256)
    {
        if (amountUsd == 0) return 0;

        TokenConfig memory tokenConfig = _tokensConfig[tokenIn];
        require(
            tokenConfig.dataFeed != address(0),
            "DV: token config not exist"
        );

        uint256 price = IDataFeed(tokenConfig.dataFeed).getDataInBase18();
        if (price == 0) return 0;

        return (amountUsd * (10**18)) / price;
    }
}
