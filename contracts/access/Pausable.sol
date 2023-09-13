// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "../access/WithMidasAccessControl.sol";
import "../interfaces/IPausable.sol";

/**
 * @title Pausable
 * @notice Base contract that implements basic functions and modifiers
 * with pause functionality
 * @author RedDuck Software
 */
abstract contract Pausable is WithMidasAccessControl, IPausable {
    /**
     * @dev isOnPause property to determine
     * whether contract is on pause or not
     */
    bool private _isOnPause;

    /**
     * @dev checks if contract is on pause
     */
    modifier pausable() {
        _pausable();
        _;
    }

    /**
     * @dev checks that a given `account`
     * has a determinedPauseAdminRole
     */
    modifier onlyPauseAdmin() {
        _onlyRole(pauseAdminRole(), msg.sender);
        _;
    }

    /**
     * @dev upgradeable patter contract`s initializer
     * @param _accessControl MidasAccessControl contract address
     */
    // solhint-disable func-name-mixedcase
    function __Pausable_init(address _accessControl) internal onlyInitializing {
        __WithMidasAccessControl_init(_accessControl);
    }

    /**
     * @dev upgradeable patter contract`s initializer
     * @param newState is new pause state
     */
    function changePauseState(bool newState) public onlyPauseAdmin {
        require(_isOnPause != newState, "P: same state");

        _isOnPause = newState;

        emit ChangeState(newState);
    }

    /**
     * @dev returns isOnPause property
     */
    function getIsOnPause() external view returns (bool) {
        return _isOnPause;
    }

    /**
     * @dev virtual function to determine pauseAdmin role
     */
    function pauseAdminRole() public view virtual returns (bytes32);

    /**
     * @dev checks if user has pauseAdmin role and if not,
     * requires to be unpaused
     */
    function _pausable() internal view {
        if (!accessControl.hasRole(pauseAdminRole(), msg.sender)) {
            require(!_isOnPause, "P: is on pause");
        }
    }
}
