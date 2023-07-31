// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

import "./interfaces/IStUSD.sol";
import "./access/Blacklistable.sol";

/**
 * @title stUSD
 * @author RedDuck Software
 */
contract stUSD is ERC20PausableUpgradeable, Blacklistable, IStUSD {
    /**
     * @notice default terms url metadata encoded key
     */
    bytes32 public constant TERMS_URL_METADATA_KEY = keccak256("urls.terms");

    /**
     * @notice default description url metadata encoded key
     */
    bytes32 public constant DESCRIPTION_URL_METADATA_KEY =
        keccak256("urls.description");

    /**
     * @notice metadata key => metadata value
     */
    mapping(bytes32 => bytes) public metadata;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable patter contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     */
    function initialize(address _accessControl) external initializer {
        __Blacklistable_init(_accessControl);
        __ERC20_init("stUSD", "stUSD");
    }

    /**
     * @inheritdoc IStUSD
     */
    function mint(
        address to,
        uint256 amount
    ) external onlyRole(ST_USD_MINT_OPERATOR_ROLE, msg.sender) {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IStUSD
     */
    function burn(
        address from,
        uint256 amount
    ) external onlyRole(ST_USD_BURN_OPERATOR_ROLE, msg.sender) {
        _burn(from, amount);
    }

    /**
     * @inheritdoc IStUSD
     */
    function pause()
        external
        override
        onlyRole(ST_USD_PAUSE_OPERATOR_ROLE, msg.sender)
    {
        _pause();
    }

    /**
     * @inheritdoc IStUSD
     */
    function unpause()
        external
        override
        onlyRole(ST_USD_PAUSE_OPERATOR_ROLE, msg.sender)
    {
        _unpause();
    }

    /**
     * @inheritdoc IStUSD
     */
    function setMetadata(
        bytes32 key,
        bytes memory data
    ) external onlyRole(DEFAULT_ADMIN_ROLE, msg.sender) {
        metadata[key] = data;
    }

    /**
     * @dev overrrides _beforeTokenTransfer function to ban
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
