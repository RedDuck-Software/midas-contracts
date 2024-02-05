// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";
import "../interfaces/IDataFeed.sol";

contract ManualAggregatorV3 is AggregatorV3Interface, WithMidasAccessControl {
    uint80 private _latestRoundId;

    struct RoundData {
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    mapping(uint80 => RoundData) private _roundData;

    constructor() {
        _disableInitializers();
    }

    function initialize(address _ac) external initializer {
        __WithMidasAccessControl_init(_ac);
    }

    function setLatestRoundData(
        uint80 round,
        RoundData calldata roundData
    ) external onlyRole(ST_USDR_ADMIN_ROLE, msg.sender) {
        require(round > _latestRoundId, "!round");
        _latestRoundId = round;
        _roundData[round] = roundData;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return getRoundData(_latestRoundId);
    }

    function decimals() external view returns (uint8) {
        return 18;
    }

    function description() external view returns (string memory) {}

    function version() external view returns (uint256) {}

    function getRoundData(
        uint80 _roundId
    )
        public
        view
        returns (
            uint80 /* roundId */,
            int256 /* answer */,
            uint256 /* startedAt */,
            uint256 /* updatedAt */,
            uint80 /* answeredInRound */
        )
    {
        RoundData memory roundData = _roundData[_roundId];

        return (
            _roundId,
            roundData.answer,
            roundData.startedAt,
            roundData.updatedAt,
            roundData.answeredInRound
        );
    }
}
