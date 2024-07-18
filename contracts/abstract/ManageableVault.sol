// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../interfaces/IManageableVault.sol";
import "../interfaces/IMTbill.sol";
import "../interfaces/IDataFeed.sol";

import "../access/Greenlistable.sol";

import "../libraries/DecimalsCorrectionLibrary.sol";
import "../access/Pausable.sol";

/**
 * @title ManageableVault
 * @author RedDuck Software
 * @notice Contract with base Vault methods
 */
abstract contract ManageableVault is Pausable, IManageableVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice address that represents off-chain USD bank transfer
     */
    address public constant MANUAL_FULLFILMENT_TOKEN = address(0x0);

    /**
     * @notice 100 percent with base 100
     * @dev for example, 10% will be (10 * 100)%
     */
    uint256 public constant ONE_HUNDRED_PERCENT = 100 * 100;
    /**
     * @notice mTBILL token
     */
    IMTbill public mTBILL;

    /**
     * @notice address to which USD and mTokens will be sent
     */
    address public tokensReceiver;

    /**
     * @dev fee for initial operations 1% = 100
     */
    uint256 public initialFee;

    /**
     * @dev daily limit for initial operations
     * if user exeed this limit he will need
     * to create requests
     */
    uint256 public initialLimit;

    /**
     * @dev mapping address to operation limit data
     */
    mapping(address => Limit) public operationLimits;

    /**
     * @notice address to which fees will be sent
     */
    address public feeReciever;

    /**
     * @notice address restriction with zero fees
     */
    mapping(address => bool) internal _waivedFeeRestriction;

    /**
     * @dev tokens that can be used as USD representation
     */
    EnumerableSet.AddressSet internal _paymentTokens;

    mapping(address => TokenConfig) internal _tokensConfig;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev checks that msg.sender do have a vaultRole() role
     */
    modifier onlyVaultAdmin() {
        _onlyRole(vaultRole(), msg.sender);
        _;
    }

    /**
     * @dev upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTBILL address of mTBILL token
     * @param _tokensReceiver address to which USD and mTokens will be sent
     */
    // solhint-disable func-name-mixedcase
    function __ManageableVault_init(
        address _ac,
        address _mTBILL,
        address _tokensReceiver,
        address _feeReciever,
        uint256 _initialFee,
        uint256 _initialLimit
    ) internal onlyInitializing {
        require(_mTBILL != address(0), "zero address");
        require(_tokensReceiver != address(0), "zero address");
        require(_tokensReceiver != address(this), "invalid address");
        require(_feeReciever != address(0), "zero address");
        require(_feeReciever != address(this), "invalid address");
        require(_initialLimit > 0, "zero limit");

        mTBILL = IMTbill(_mTBILL);
        __Pausable_init(_ac);

        tokensReceiver = _tokensReceiver;
        feeReciever = _feeReciever;
        initialFee = _initialFee;
        initialLimit = _initialLimit;
    }

    /**
     * @notice withdraws `amount` of a given `token` from the contract.
     * can be called only from permissioned actor.
     * @param token token address
     * @param amount token amount
     * @param withdrawTo withdraw destination address
     */
    function withdrawToken(
        address token,
        uint256 amount,
        address withdrawTo
    ) external onlyVaultAdmin {
        IERC20(token).safeTransfer(withdrawTo, amount);

        emit WithdrawToken(msg.sender, token, withdrawTo, amount);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if token is already added
     */
    function addPaymentToken(
        address token,
        address dataFeed,
        uint256 tokenFee
    ) external onlyVaultAdmin {
        require(_paymentTokens.add(token), "MV: already added");
        _tokensConfig[token] = TokenConfig(dataFeed, tokenFee);
        emit AddPaymentToken(token, dataFeed, tokenFee, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if token is not presented
     */
    function removePaymentToken(address token) external onlyVaultAdmin {
        require(_paymentTokens.remove(token), "MV: not exists");
        delete _tokensConfig[token];
        emit RemovePaymentToken(token, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts address zero or equal address(this)
     */
    function setFeeReciever(address reciever) external onlyVaultAdmin {
        require(reciever != address(0), "zero address");
        require(reciever != address(this), "invalid address");
        feeReciever = reciever;

        emit SetFeeReciever(msg.sender, reciever);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInitialFee(uint256 newInitialFee) external onlyVaultAdmin {
        initialFee = newInitialFee;
        emit SetInitialFee(msg.sender, newInitialFee);
    }

    /**
     * @notice returns array of stablecoins supported by the vault
     * can be called only from permissioned actor.
     * @return paymentTokens array of payment tokens
     */
    function getPaymentTokens() external view returns (address[] memory) {
        return _paymentTokens.values();
    }

    /**
     * @notice AC role of vault administrator
     * @return role bytes32 role
     */
    function vaultRole() public view virtual returns (bytes32);

    /**
     * @notice AC role of vault`s pauser
     * @return role bytes32 role
     */
    function pauseAdminRole() public view override returns (bytes32) {
        return vaultRole();
    }

    /**
     * @dev do safeTransferFrom on a given token
     * and converts `amount` from base18
     * to amount with a correct precision. Sends tokens
     * from `msg.sender` to `tokensReceiver`
     * @param token address of token
     * @param amount amount of `token` to transfer from `user`
     */
    function _tokenTransferFromUser(
        address token,
        address to,
        uint256 amount
    ) internal {
        uint256 tokenDecimals = _tokenDecimals(token);
        uint256 transferAmount = amount.convertFromBase18(tokenDecimals);

        require(
            amount == transferAmount.convertToBase18(tokenDecimals),
            "MV: invalid rounding"
        );

        IERC20(token).safeTransferFrom(msg.sender, to, transferAmount);
    }

    /**
     * @dev retreives decimals of a given `token`
     * @param token address of token
     * @return decimals decinmals value of a given `token`
     */
    function _tokenDecimals(address token) internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    /**
     * @dev checks that `token` is presented in `_paymentTokens`
     * @param token address of token
     */
    function _requireTokenExists(address token) internal view virtual {
        require(_paymentTokens.contains(token), "MV: token not exists");
    }

    /**
     * @dev check if user exeed daily limit and update limit data
     * @param sender address of sender
     * @param amount operation amount
     */
    function _requireAndUpdateLimit(address sender, uint256 amount) internal {
        Limit memory opLimit = operationLimits[sender];

        uint256 currentDayNumber = block.timestamp / 86400;
        uint256 prevUpdateDayNumber = opLimit.updateTs / 86400;
        uint256 updatedLimit = currentDayNumber > prevUpdateDayNumber
            ? amount
            : opLimit.limit + amount;

        require(updatedLimit <= initialLimit, "MV: exeed limit");

        operationLimits[sender] = Limit(block.timestamp, updatedLimit);
    }

    /**
     * @dev returns how much mtBill user should receive from USD inputted
     * @param sender sender address
     * @param tokenIn token address
     * @param amountUsdIn amount of USD
     * @return fee amount of input token
     */
    function _getFeeAmount(
        address sender,
        address tokenIn,
        uint256 amountUsdIn
    ) internal view returns (uint256) {
        if (amountUsdIn == 0) return 0;
        if (_waivedFeeRestriction[sender]) return amountUsdIn;

        TokenConfig memory tokenConfig = _tokensConfig[tokenIn];
        require(
            tokenConfig.dataFeed != address(0),
            "MV: token config not exist"
        );

        uint256 feePercent = initialFee + tokenConfig.fee;

        return (amountUsdIn * feePercent) / ONE_HUNDRED_PERCENT;
    }
}
