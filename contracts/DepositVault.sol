// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

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
     * @notice users restricted from depositin minDepositAmountInEuro
     */
    mapping(address => bool) public isFreeFromMinDeposit;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev deposit fee 1% = 100
     */
    uint256 private _fee;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTBILL address of mTBILL token
     * @param _eurUsdDataFeed address of CL`s data feed EUR/USD
     * @param _minAmountToDepositInEuro initial value for minAmountToDepositInEuro
     * @param _usdReceiver address of usd tokens receiver
     */
    function initialize(
        address _ac,
        address _mTBILL,
        address _tokenDataFeed,
        address _eurUsdDataFeed,
        uint256 _minAmountToDepositInEuro,
        address _usdReceiver
    ) external initializer {
        require(_eurUsdDataFeed != address(0), "zero address");

        __ManageableVault_init(_ac, _mTBILL, _usdReceiver, _tokenDataFeed);
        minAmountToDepositInEuro = _minAmountToDepositInEuro;
        eurUsdDataFeed = IDataFeed(_eurUsdDataFeed);
    }

    /**
     * @inheritdoc IDepositVault
     * @dev transfers `tokenIn` from `msg.sender`
     * to `tokensReceiver`
     * @param tokenIn address of token to deposit.
     * @param amountUsdIn amount of token to deposit in 10**18 decimals.
     */
    function deposit(address tokenIn, uint256 amountUsdIn)
        external
        whenNotPaused
    {
        require(amountUsdIn > 0, "DV: invalid amount");
        address user = msg.sender;

        _requireTokenExists(tokenIn);

        if (!isFreeFromMinDeposit[user]) {
            _validateAmountUsdIn(user, amountUsdIn);
        }

        totalDeposited[user] += amountUsdIn;
        _tokenTransferFromUser(tokenIn, amountUsdIn);

        uint256 mintAmount = _getOutputAmountWithoutFee(amountUsdIn);   
        require(mintAmount > 0, "DV: invalid amount out");  
        mTBILL.mint(user, mintAmount); 

        emit Deposit(user, tokenIn, amountUsdIn, mintAmount);
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
        minAmountToDepositInEuro = newValue;

        emit SetMinAmountToDeposit(msg.sender, newValue);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setFee(uint256 newFee) external onlyVaultAdmin {
        _fee = newFee;
        emit SetFee(msg.sender, newFee);
    }

     /**
     * @inheritdoc IDepositVault
     */
    function getFee() public view returns (uint256) {
        return _fee;
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
        require(
            amountUsdIn >= minAmountToDepositInUsd(),
            "DV: usd amount < min"
        );
    }

    /**
     * @dev returns how much mtBill user should receive from USD inputted
     * @param amountUsdIn amount of USD
     * @return outputMtBill amount of mtBill that should be minted to user
     */
    function _getOutputAmountWithoutFee(
        uint256 amountUsdIn
    ) internal view returns (uint256) {
        if (amountUsdIn == 0) return 0;

        uint256 price = tokenDataFeed.getDataInBase18();
        if(price == 0) return 0;

        uint256 amountOut = amountUsdIn * (10 ** 18) / (price);
        return
            amountOut -
            ((amountOut * getFee()) / ONE_HUNDRED_PERCENT);
    }
}
