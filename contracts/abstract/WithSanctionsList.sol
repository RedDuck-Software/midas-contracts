// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/ISanctionsList.sol";
import "../access/WithMidasAccessControl.sol";
import "./MidasInitializable.sol";

// TODO: add natspec
abstract contract WithSanctionsList is WithMidasAccessControl {
    address public sanctionsList;

    event SetSanctionsList(
        address indexed caller,
        address indexed newSanctionsList
    );

    /**
     * @dev checks that a given `user` is not sanctioned
     */
    modifier onlyNotSanctioned(address user) {
        address _sanctionsList = sanctionsList;
        if (_sanctionsList != address(0)) {
            require(
                !ISanctionsList(_sanctionsList).isSanctioned(user),
                "WSL: sanctioned"
            );
        }
        _;
    }

    /**
     * @dev upgradeable pattern contract`s initializer
     */
    // solhint-disable func-name-mixedcase
    function __WithSanctionsList_init(
        address _accesControl,
        address _sanctionsList
    ) internal onlyInitializing {
        __WithMidasAccessControl_init(_accesControl);
        __WithSanctionsList_init_unchained(_sanctionsList);
    }

    /**
     * @dev upgradeable pattern contract`s initializer unchained
     */
    // solhint-disable func-name-mixedcase
    function __WithSanctionsList_init_unchained(
        address _sanctionsList
    ) internal onlyInitializing {
        sanctionsList = _sanctionsList;
    }

    function setSanctionsList(address newSanctionsList) external {
        _onlyRole(sanctionsListAdminRole(), msg.sender);

        sanctionsList = newSanctionsList;
        emit SetSanctionsList(msg.sender, newSanctionsList);
    }

    function sanctionsListAdminRole() public view virtual returns (bytes32);
}
