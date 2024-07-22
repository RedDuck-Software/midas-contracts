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
     * @param _feeReceiver address of fee in usd tokens receiver
     * @param _initialFee fee for initial mint
     */
    function initialize(
        address _ac,
        address _mTBILL,
        uint256 _minAmountToDeposit,
        address _usdReceiver,
        address _feeReceiver,
        uint256 _initialFee,
        uint256 _initialLimit
    ) external initializer {
        __ManageableVault_init(
            _ac,
            _mTBILL,
            _usdReceiver,
            _feeReceiver,
            _initialFee,
            _initialLimit
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
        whenNotPaused
    {
        require(amountToken > 0, "DV: invalid amount");
        address user = msg.sender;

        _requireTokenExists(tokenIn);

        if (!isFreeFromMinDeposit[user]) {
            _validateAmountUsdIn(user, amountToken);
        }

        _requireAndUpdateAllowance(tokenIn, amountToken);

        totalDeposited[user] += amountToken;

        uint256 feeAmount = _getFeeAmount(user, tokenIn, amountToken, true);
        uint256 amountTokenWithoutFee = amountToken - feeAmount;

        uint256 mintAmount = _getConvertedAmount(tokenIn, amountTokenWithoutFee);
        require(mintAmount > 0, "DV: invalid mint amount");

        _requireAndUpdateLimit(mintAmount);

        _tokenTransferFromUser(tokenIn, tokensReceiver, amountTokenWithoutFee);

        mTBILL.mint(user, mintAmount);

        if (feeAmount > 0)
            _tokenTransferFromUser(tokenIn, feeReceiver, feeAmount);

        emit Deposit(user, tokenIn, amountToken, feeAmount, mintAmount);
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

        TokenConfig memory tokenConfig = tokensConfig[tokenIn];
        require(
            tokenConfig.dataFeed != address(0),
            "DV: token config not exist"
        );

        uint256 price = IDataFeed(tokenConfig.dataFeed).getDataInBase18();
        if (price == 0) return 0;

        return (amountUsd * (10**18)) / price;
    }
}
