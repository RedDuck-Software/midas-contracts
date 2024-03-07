// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

import "./interfaces/ISTUsd.sol";
import "./access/Blacklistable.sol";

/**
 * @title stUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract stUSD is ERC20PausableUpgradeable, Blacklistable, ISTUsd {
    /**
     * @notice metadata key => metadata value
     */
    mapping(bytes32 => bytes) public metadata;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     */
    function initialize(address _accessControl) external initializer {
        __Blacklistable_init(_accessControl);
        __ERC20_init("stUSD", "stUSD");
    }

    /**
     * @inheritdoc ISTUsd
     */
    function mint(
        address to,
        uint256 amount
    ) external onlyRole(ST_USD_MINT_OPERATOR_ROLE, msg.sender) {
        _mint(to, amount);
    }

    /**
     * @inheritdoc ISTUsd
     */
    function burn(
        address from,
        uint256 amount
    ) external onlyRole(ST_USD_BURN_OPERATOR_ROLE, msg.sender) {
        _burn(from, amount);
    }

    /**
     * @inheritdoc ISTUsd
     */
    function pause()
        external
        override
        onlyRole(ST_USD_PAUSE_OPERATOR_ROLE, msg.sender)
    {
        _pause();
    }

    /**
     * @inheritdoc ISTUsd
     */
    function unpause()
        external
        override
        onlyRole(ST_USD_PAUSE_OPERATOR_ROLE, msg.sender)
    {
        _unpause();
    }

    /**
     * @inheritdoc ISTUsd
     */
    function setMetadata(
        bytes32 key,
        bytes memory data
    ) external onlyRole(DEFAULT_ADMIN_ROLE, msg.sender) {
        metadata[key] = data;
    }

    /**
     * @dev overrides _beforeTokenTransfer function to ban
     * blaclisted users from using the token functions
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    )
        internal
        virtual
        override(ERC20PausableUpgradeable)
        onlyNotBlacklisted(from)
        onlyNotBlacklisted(to)
    {
        ERC20PausableUpgradeable._beforeTokenTransfer(from, to, amount);
    }
}
