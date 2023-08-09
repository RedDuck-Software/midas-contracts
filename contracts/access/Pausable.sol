// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../access/WithMidasAccessControl.sol";
import "../interfaces/IPausable.sol";

import "hardhat/console.sol";

abstract contract Pausable is WithMidasAccessControl, IPausable {
    bool private _isOnPause;

    modifier pausable() {
        _pausable();
        _;
    }

    modifier onlyPauseAdmin() {
        _onlyRole(pauseAdminRole(), msg.sender);
        _;
    }

    function __Pausable_init(address _accessControl) internal onlyInitializing {
        __WithMidasAccessControl_init(_accessControl);
    }

    function changePauseState(bool newState) public onlyPauseAdmin {
        require(_isOnPause != newState, "P: same state");

        _isOnPause = newState;

        emit ChangeState(newState);
    }

    function getIsOnPause() external view returns (bool) {
        return _isOnPause;
    }

    function pauseAdminRole() public view virtual returns (bytes32);

    function _pausable() internal view {
        if (!accessControl.hasRole(pauseAdminRole(), msg.sender)) {
            require(!_isOnPause, "P: is on pause");
        }
    }
}
