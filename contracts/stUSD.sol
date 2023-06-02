// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

import "./access/Blacklistable.sol";

contract stUSD is ERC20PausableUpgradeable, Blacklistable {
    bytes32 public constant TERMS_URL_METADATA_KEY = keccak256("urls.terms");

    bytes32 public constant DESCRIPTION_URL_METADATA_KEY =
        keccak256("urls.description");

    mapping(bytes32 => bytes) public metadata;

    function initialize(address _accessControl) external initializer {
        __Blacklistable_init(_accessControl);
        __ERC20_init("stUSD", "stUSD");
    }

    function mint(
        address to,
        uint256 amount
    ) external onlyRole(ST_USD_MINT_OPERATOR_ROLE, msg.sender) {
        _mint(to, amount);
    }

    function burn(
        address from,
        uint256 amount
    ) external onlyRole(ST_USD_BURN_OPERATOR_ROLE, msg.sender) {
        _burn(from, amount);
    }

    function pause() external onlyRole(ST_USD_PAUSE_OPERATOR_ROLE, msg.sender) {
        _pause();
    }

    function unpause()
        external
        onlyRole(ST_USD_PAUSE_OPERATOR_ROLE, msg.sender)
    {
        _unpause();
    }

    function setMetadata(
        bytes32 key,
        bytes memory data
    ) external onlyRole(DEFAULT_ADMIN_ROLE, msg.sender) {
        metadata[key] = data;
    }

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
