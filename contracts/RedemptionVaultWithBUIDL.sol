// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./RedemptionVault.sol";

import "./interfaces/buidl/IRedemption.sol";
import "./interfaces/buidl/ILiquiditySource.sol";
import "./interfaces/buidl/ISettlement.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles mTBILL redemptions
 * @author RedDuck Software
 */
contract RedemptionVaultWIthBUIDL is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    IRedemption public buidlRedemption;

    IERC20 public buidl;

    ILiquiditySource public buidlLiquiditySource;

    ISettlement public buidlSettlement;

    IERC20 public mBasis;

    IDataFeed public mBasisDataFeed;

    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations
     * @param _fiatRedemptionInitParams params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount
     * @param _buidlRedemption BUIDL redemption contract address
     * @param _mBasisInitParams params mBasis, mBasisDataFeed
     */
    function initialize(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        FiatRedeptionInitParams calldata _fiatRedemptionInitParams,
        address _buidlRedemption,
        MBasisInitParams calldata _mBasisInitParams
    ) external initializer {
        __RedemptionVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _fiatRedemptionInitParams
        );
        _validateAddress(_buidlRedemption, false);
        _validateAddress(_mBasisInitParams.mBasis, false);
        _validateAddress(_mBasisInitParams.mBasisDataFeed, false);

        buidlRedemption = IRedemption(_buidlRedemption);
        buidlSettlement = ISettlement(buidlRedemption.settlement());
        buidlLiquiditySource = ILiquiditySource(buidlRedemption.liquidity());
        buidl = IERC20(buidlRedemption.asset());

        mBasis = IERC20(_mBasisInitParams.mBasis);
        mBasisDataFeed = IDataFeed(_mBasisInitParams.mBasisDataFeed);
    }

    /**
     * @notice redeem mToken to USDC if daily limit and allowance not exceeded
     * If contract don't have enough USDC, BUIDL redemption flow will be triggered
     * Burns mTBILL from the user.
     * Transfers fee in mToken to feeReceiver
     * Transfers tokenOut to user.
     * @param tokenIn token in address, if mBasis will be triggered swap mBasis to mToken flow,
     * if not ignored
     * @param amountMTokenIn amount of mTBILL to redeem
     */
    function redeemInstant(address tokenIn, uint256 amountMTokenIn)
        external
        override
        whenFnNotPaused(this.redeemInstant.selector)
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
    {
        address user = msg.sender;

        if (tokenIn == address(mBasis)) {
            amountMTokenIn = _swapMBasisToMToken(amountMTokenIn);
        }

        address tokenOut = buidlLiquiditySource.token();

        (
            uint256 feeAmount,
            uint256 amountMTokenWithoutFee
        ) = _calcAndValidateRedeem(user, tokenOut, amountMTokenIn, true, false);

        _requireAndUpdateLimit(amountMTokenIn);

        uint256 tokenDecimals = _tokenDecimals(tokenOut);

        uint256 amountMTokenInCopy = amountMTokenIn;
        address tokenInCopy = tokenIn;

        (uint256 amountMTokenInUsd, uint256 mTokenRate) = _convertMTokenToUsd(
            amountMTokenInCopy
        );
        (uint256 amountTokenOut, uint256 tokenOutRate) = _convertUsdToToken(
            amountMTokenInUsd,
            tokenOut
        );

        _requireAndUpdateAllowance(tokenOut, amountTokenOut);

        address burnFrom = tokenInCopy == address(mBasis)
            ? address(this)
            : user;
        mToken.burn(burnFrom, amountMTokenWithoutFee);

        if (feeAmount > 0) {
            if (tokenInCopy == address(mBasis)) {
                _tokenTransferToUser(
                    address(mToken),
                    feeReceiver,
                    feeAmount,
                    18
                );
            } else {
                _tokenTransferFromUser(
                    address(mToken),
                    feeReceiver,
                    feeAmount,
                    18
                );
            }
        }

        uint256 amountTokenOutWithoutFee = (amountMTokenWithoutFee *
            mTokenRate) / tokenOutRate;
        uint256 amountTokenOutWithoutFeeFrom18 = amountTokenOutWithoutFee
            .convertFromBase18(tokenDecimals);

        _checkAndRedeemBUIDL(tokenOut, amountTokenOutWithoutFeeFrom18);

        _tokenTransferToUser(
            tokenOut,
            user,
            amountTokenOutWithoutFeeFrom18.convertToBase18(tokenDecimals),
            tokenDecimals
        );

        emit RedeemInstant(
            user,
            tokenOut,
            amountMTokenInCopy,
            feeAmount,
            amountTokenOutWithoutFee
        );
    }

    /**
     * @notice Check if contract have enough USDC balance for redeem
     * if don't have trigger BUIDL redemption flow
     * @param tokenOut tokenOut address
     * @param amountTokenOut amount of tokenOut
     */
    function _checkAndRedeemBUIDL(address tokenOut, uint256 amountTokenOut)
        internal
    {
        uint256 contractBalanceTokenOut = IERC20(tokenOut).balanceOf(
            address(this)
        );
        if (contractBalanceTokenOut >= amountTokenOut) return;

        uint256 buidlToRedeem = amountTokenOut - contractBalanceTokenOut;

        buidl.safeIncreaseAllowance(address(buidlRedemption), buidlToRedeem);
        buidlRedemption.redeem(buidlToRedeem);
    }

    /**
     * @notice Transfers mBasis to contract
     * Returns amount on mToken using exchange rates
     * @param mBasisAmount mBasis token amount
     */
    function _swapMBasisToMToken(uint256 mBasisAmount)
        internal
        returns (uint256)
    {
        require(mBasisAmount > 0, "RVB: mBasisAmount zero");

        _tokenTransferFromUser(
            address(mBasis),
            address(this),
            mBasisAmount,
            18
        );

        uint256 mBasisRate = mBasisDataFeed.getDataInBase18();
        uint256 mTokenRate = mTokenDataFeed.getDataInBase18();

        return (mBasisAmount * mBasisRate) / mTokenRate;
    }
}
