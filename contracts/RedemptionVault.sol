// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IRedemptionVault.sol";
import "./interfaces/IMTbill.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

import "./access/Greenlistable.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles mTBILL redemptions
 * @author RedDuck Software
 */
contract RedemptionVault is ManageableVault, IRedemptionVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    /**
     * @notice last redemption request id
     */
    Counters.Counter public lastRequestId;

    uint256 public minRedeemAmount;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mToken address of mTBILL token
     * @param _tokensReceiver address of mTBILL token receiver
     */
    function initialize(
        address _ac,
        address _mToken,
        address _tokensReceiver,
        address _feeReciever,
        uint256 _initialFee,
        uint256 _initialLimit,
        address _mTokenDataFeed,
        address _sanctionsList,
        uint256 _minRedeemAmount,
        uint256 _variationTolerance
    ) external initializer {
        __ManageableVault_init(
            _ac,
            _mToken,
            _tokensReceiver,
            _feeReciever,
            _initialFee,
            _initialLimit,
            _mTokenDataFeed,
            _sanctionsList,
            _variationTolerance
        );
        minRedeemAmount = _minRedeemAmount;
    }

    function redeemInstant(address tokenOut, uint256 amountMTokenIn)
        external
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        whenNotPaused
    {
        require(amountMTokenIn > 0, "RV: 0 amount");

        address user = msg.sender;

        _requireTokenExists(tokenOut);

        _requireAndUpdateLimit(amountMTokenIn);

        uint256 feeAmount = _getFeeAmount(user, tokenOut, amountMTokenIn, true);
        uint256 amountMTokenWithoutFee = amountMTokenIn - feeAmount;

        mToken.burn(user, amountMTokenWithoutFee);
        if (feeAmount > 0)
            _tokenTransferFromUser(address(mToken), feeReceiver, feeAmount);



        // emit Redeem(requestId, user, tokenOut, amountTBillIn);
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure virtual override returns (bytes32) {
        return REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @dev checks that provided `token` is supported by the vault
     * @param token token address
     */
    function _requireTokenExists(address token) internal view override {
        if (token == MANUAL_FULLFILMENT_TOKEN) return;
        super._requireTokenExists(token);
    }
}
