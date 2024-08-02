// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../access/WithMidasAccessControl.sol";

/**
 * @title Pausable
 * @notice Base contract that implements basic functions and modifiers
 * with pause functionality
 * @author RedDuck Software
 */
abstract contract Pausable is WithMidasAccessControl, PausableUpgradeable {

    mapping(uint8 => bool) public fnPaused;

    /**
     * @param caller caller address (msg.sender)
     * @param fn function id
     */
    event PauseFn(address indexed caller, uint8 fn);

    /**
     * @param caller caller address (msg.sender)
     * @param fn function id
     */
    event UnpauseFn(address indexed caller, uint8 fn);

    modifier whenFnNotPaused(uint8 fn) {
        _requireNotPaused();
        require(!fnPaused[fn], "Pausable: fn paused");
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
     * @dev upgradeable pattern contract`s initializer
     * @param _accessControl MidasAccessControl contract address
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Pausable_init(address _accessControl) internal onlyInitializing {
        super.__Pausable_init();
        __WithMidasAccessControl_init(_accessControl);
    }

    function pause() external onlyPauseAdmin {
        _pause();
    }

    function unpause() external onlyPauseAdmin {
        _unpause();
    }

    /**
     * @dev pause specific function
     * @param fn function id
     */
    function pauseFn(uint8 fn) external onlyPauseAdmin {
        require(!fnPaused[fn], "Pausable: fn paused");
        fnPaused[fn] = true;
        emit PauseFn(msg.sender, fn);
    }

    /**
     * @dev unpause specific function
     * @param fn function id
     */
    function unpauseFn(uint8 fn) external onlyPauseAdmin {
        require(fnPaused[fn], "Pausable: fn unpaused");
        fnPaused[fn] = false;
        emit UnpauseFn(msg.sender, fn);
    }

    /**
     * @dev virtual function to determine pauseAdmin role
     */
    function pauseAdminRole() public view virtual returns (bytes32);
}
