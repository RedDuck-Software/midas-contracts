// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

import "./interfaces/IMTbill.sol";
import "./access/Blacklistable.sol";

/**
 * @title eUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract eUSD is ERC20PausableUpgradeable, Blacklistable, IMTbill {
    /**
     * @notice actor that can mint eUSD
     */
    bytes32 public constant E_USD_MINT_OPERATOR_ROLE =
        keccak256("E_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn eUSD
     */
    bytes32 public constant E_USD_BURN_OPERATOR_ROLE =
        keccak256("E_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause eUSD
     */
    bytes32 public constant E_USD_PAUSE_OPERATOR_ROLE =
        keccak256("E_USD_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Etherlink USD", "eUSD");
    }

    /**
     * @inheritdoc IMTbill
     */
    function mint(
        address to,
        uint256 amount
    ) external onlyRole(E_USD_MINT_OPERATOR_ROLE, msg.sender) {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IMTbill
     */
    function burn(
        address from,
        uint256 amount
    ) external onlyRole(E_USD_BURN_OPERATOR_ROLE, msg.sender) {
        _burn(from, amount);
    }

    /**
     * @inheritdoc IMTbill
     */
    function pause()
        external
        override
        onlyRole(E_USD_PAUSE_OPERATOR_ROLE, msg.sender)
    {
        _pause();
    }

    /**
     * @inheritdoc IMTbill
     */
    function unpause()
        external
        override
        onlyRole(E_USD_PAUSE_OPERATOR_ROLE, msg.sender)
    {
        _unpause();
    }

    /**
     * @inheritdoc IMTbill
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
