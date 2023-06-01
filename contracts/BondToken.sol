
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";


contract stUSD is ERC20Pausable { 
    bytes32 public constant TERMS_URL_METADATA_KEY = keccak256("urls.terms");
    bytes32 public constant DESCRIPTION_URL_METADATA_KEY = keccak256("urls.description");

    mapping (bytes32 => bytes) public metadata;

    constructor() ERC20("stUSD", "stUSD") {}


    function pause() external {
        _pause();
    }

    function unpause() external {
        _unpause();
    }

    function setMetadata(
        bytes32 key,
        bytes memory data
    ) external {
        metadata[key] = data;
    }
}
