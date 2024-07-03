// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title mBASIS
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mBASIS is mTBILL {
    /**
     * @notice actor that can mint mBASIS
     */
    bytes32 public constant M_BASIS_MINT_OPERATOR_ROLE =
        keccak256("M_BASIS_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mBASIS
     */
    bytes32 public constant M_BASIS_BURN_OPERATOR_ROLE =
        keccak256("M_BASIS_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mBASIS
     */
    bytes32 public constant M_BASIS_PAUSE_OPERATOR_ROLE =
        keccak256("M_BASIS_PAUSE_OPERATOR_ROLE");

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     */
    function initialize(address _accessControl) external override initializer {
        __Blacklistable_init(_accessControl);
        __ERC20_init("Midas Basis Trading Token", "mBASIS");
    }

    /**
     * @dev AC role, owner of which can mint mBASIS token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_BASIS_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mBASIS token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_BASIS_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mBASIS token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_BASIS_PAUSE_OPERATOR_ROLE;
    }
}
