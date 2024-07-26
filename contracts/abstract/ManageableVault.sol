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
import "../access/Blacklistable.sol";
import "../abstract/WithSanctionsList.sol";

import "../libraries/DecimalsCorrectionLibrary.sol";
import "../access/Pausable.sol";

/**
 * @title ManageableVault
 * @author RedDuck Software
 * @notice Contract with base Vault methods
 */
abstract contract ManageableVault is
    Pausable,
    IManageableVault,
    Blacklistable,
    Greenlistable,
    WithSanctionsList
{
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

    uint256 public constant MAX_UINT = type(uint256).max;

    /**
     * @notice mToken token
     */
    IMTbill public mToken;

    IDataFeed public mTokenDataFeed;

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
     * @dev mapping days number from 1970 to limit amount
     */
    mapping(uint256 => uint256) public dailyLimits;

    /**
     * @notice address to which fees will be sent
     */
    address public feeReceiver;

    /**
     * @notice variation tolerance of tokenOut rates for "safe" requests approve
     */
    uint256 public variationTolerance;

    /**
     * @notice address restriction with zero fees
     */
    mapping(address => bool) public waivedFeeRestriction;

    /**
     * @dev tokens that can be used as USD representation
     */
    EnumerableSet.AddressSet internal _paymentTokens;

    mapping(address => TokenConfig) public tokensConfig;

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
     * @param _mToken address of mTBILL token
     * @param _tokensReceiver address to which USD and mTokens will be sent
     */
    // solhint-disable func-name-mixedcase
    function __ManageableVault_init(
        address _ac,
        address _mToken,
        address _tokensReceiver,
        address _feeReceiver,
        uint256 _initialFee,
        uint256 _initialLimit,
        address _mTokenDataFeed,
        address _sanctionsList,
        uint256 _variationTolerance
    ) internal onlyInitializing {
        require(_mToken != address(0), "zero address");
        require(_tokensReceiver != address(0), "zero address");
        require(_tokensReceiver != address(this), "invalid address");
        require(_feeReceiver != address(0), "zero address");
        require(_feeReceiver != address(this), "invalid address");
        require(_mTokenDataFeed != address(0), "invalid address");
        require(_initialLimit > 0, "zero limit");
        require(_variationTolerance > 0, "zero tolerance");

        mToken = IMTbill(_mToken);
        __Pausable_init(_ac);
        __Greenlistable_init(_ac);
        __Blacklistable_init(_ac);
        __WithSanctionsList_init_unchained(_sanctionsList);

        tokensReceiver = _tokensReceiver;
        feeReceiver = _feeReceiver;
        initialFee = _initialFee;
        initialLimit = _initialLimit;
        variationTolerance = _variationTolerance;
        mTokenDataFeed = IDataFeed(_mTokenDataFeed);
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
        require(dataFeed != address(0), "MV: dataFeed address zero");
        tokensConfig[token] = TokenConfig(dataFeed, tokenFee, MAX_UINT);
        emit AddPaymentToken(token, dataFeed, tokenFee, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if token is not presented
     */
    function removePaymentToken(address token) external onlyVaultAdmin {
        require(_paymentTokens.remove(token), "MV: not exists");
        delete tokensConfig[token];
        emit RemovePaymentToken(token, msg.sender);
    }

    // @dev if MAX_UINT = infinite allowance
    function changeTokenAllowance(address token, uint256 allowance)
        external
        onlyVaultAdmin
    {
        _requireTokenExists(token);
        require(allowance > 0, "MV: zero allowance");
        tokensConfig[token].allowance = allowance;
        emit ChangeTokenAllowance(token, allowance, msg.sender);
    }

    function setVariationTolerance(uint256 tolerance)
        external
        onlyVaultAdmin
    {
        require(tolerance > 0, "MV: zero tolerance");
        variationTolerance = tolerance;
        emit SetVariationTolerance(msg.sender, tolerance);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if account is already added
     */
    function addWaivedFeeAccount(address account) external onlyVaultAdmin {
        require(!waivedFeeRestriction[account], "MV: already added");
        waivedFeeRestriction[account] = true;
        emit AddWaivedFeeAccount(account, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if account is already removed
     */
    function removeWaivedFeeAccount(address account) external onlyVaultAdmin {
        require(waivedFeeRestriction[account], "MV: not found");
        waivedFeeRestriction[account] = false;
        emit RemoveWaivedFeeAccount(account, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts address zero or equal address(this)
     */
    function setFeeReceiver(address receiver) external onlyVaultAdmin {
        require(receiver != address(0), "zero address");
        require(receiver != address(this), "invalid address");
        feeReceiver = receiver;

        emit SetFeeReceiver(msg.sender, receiver);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInitialFee(uint256 newInitialFee) external onlyVaultAdmin {
        initialFee = newInitialFee;
        emit SetInitialFee(msg.sender, newInitialFee);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInitialLimit(uint256 newInitialLimit) external onlyVaultAdmin {
        require(newInitialLimit > 0, "MV: limit zero");
        initialLimit = newInitialLimit;
        emit SetInitialLimit(msg.sender, newInitialLimit);
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
     * @inheritdoc WithSanctionsList
     */
    function sanctionsListAdminRole()
        public
        view
        virtual
        override
        returns (bytes32)
    {
        return vaultRole();
    }

    /**
     * @inheritdoc Pausable
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
     * @dev check if operation exeed daily limit and update limit data
     * @param amount operation amount
     */
    function _requireAndUpdateLimit(uint256 amount) internal {
        uint256 currentDayNumber = block.timestamp / 86400;
        uint256 nextLimitAmount = dailyLimits[currentDayNumber] + amount;

        require(nextLimitAmount <= initialLimit, "MV: exeed limit");

        dailyLimits[currentDayNumber] = nextLimitAmount;
    }

    function _requireAndUpdateAllowance(address token, uint256 amount)
        internal
    {
        TokenConfig storage config = tokensConfig[token];
        if (config.allowance == MAX_UINT) return;

        require(config.allowance >= amount, "MV: exeed allowance");

        config.allowance -= amount;
    }

    /**
     * @dev returns how much mtBill user should receive from token inputted
     * @param sender sender address
     * @param token token address
     * @param amount amount of token
     * @return fee amount of input token
     */
    function _getFeeAmount(
        address sender,
        address token,
        uint256 amount,
        bool isInstant
    ) internal view returns (uint256) {
        if (amount == 0) return 0;
        if (waivedFeeRestriction[sender]) return 0;

        TokenConfig storage tokenConfig = tokensConfig[token];

        uint256 feePercent = tokenConfig.fee;
        if (isInstant) feePercent += initialFee;

        if (feePercent > ONE_HUNDRED_PERCENT) feePercent = ONE_HUNDRED_PERCENT;

        return (amount * feePercent) / ONE_HUNDRED_PERCENT;
    }

    function _requireVariationTolerance(uint256 prevPrice, uint256 newPrice) internal view {
        uint256 priceDif = newPrice >= prevPrice ? newPrice - prevPrice : prevPrice - newPrice;

        uint256 priceDifPercent = priceDif * ONE_HUNDRED_PERCENT / prevPrice;
        
        require(priceDifPercent <= variationTolerance, "MV: exceed price diviation");
    }
}
