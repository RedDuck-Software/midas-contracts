// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../abstract/ManageableVault.sol";

contract ManageableVaultTester is ManageableVault {
    function _disableInitializers() internal override {}

    function initialize(
        address _accessControl,
        address _mTbill,
        address _tokensReceiver,
        address _feeReciever,
        uint256 _initialFee,
        uint256 _initialLimit,
        address _mTokenDataFeed,
        address _sanctionsList
    ) external initializer {
        __ManageableVault_init(
            _accessControl,
            _mTbill,
            _tokensReceiver,
            _feeReciever,
            _initialFee,
            _initialLimit,
            _mTokenDataFeed,
            _sanctionsList
        );
    }

    function initializeWithoutInitializer(
        address _accessControl,
        address _mTbill,
        address _tokensReceiver,
        address _feeReciever,
        uint256 _initialFee,
        uint256 _initialLimit,
        address _mTokenDataFeed,
        address _sanctionsList
    ) external {
        __ManageableVault_init(
            _accessControl,
            _mTbill,
            _tokensReceiver,
            _feeReciever,
            _initialFee,
            _initialLimit,
            _mTokenDataFeed,
            _sanctionsList
        );
    }

    function vaultRole() public view virtual override returns (bytes32) {}
}
