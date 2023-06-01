// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

import "./access/Blacklistable.sol";

contract stUSD is ERC20Pausable, Blacklistable {
    bytes32 public constant TERMS_URL_METADATA_KEY = keccak256("urls.terms");
    bytes32 public constant DESCRIPTION_URL_METADATA_KEY =
        keccak256("urls.description");

    mapping(bytes32 => bytes) public metadata;

    constructor(address _ac) ERC20("stUSD", "stUSD") Blacklistable(_ac) {}

    function pause() external onlyRole(ST_USD_PAUSE_OPERATOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ST_USD_PAUSE_OPERATOR_ROLE) {
        _unpause();
    }

    function setMetadata(
        bytes32 key,
        bytes memory data
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        metadata[key] = data;
    }
}