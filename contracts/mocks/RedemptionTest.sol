// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../interfaces/buidl/IRedemption.sol";
import "../interfaces/buidl/ILiquiditySource.sol";

contract RedemptionTest is IRedemption {

    address public asset;

    address public liquidity;
    
    constructor(address _asset, address _liquidity){
        asset = _asset;
        liquidity = _liquidity;
    }

    function redeem(uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        address token = ILiquiditySource(liquidity).token();
        IERC20(token).transfer(msg.sender, amount);
    }
}