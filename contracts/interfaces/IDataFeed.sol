// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";

interface IDataFeed {
    struct RecordedDataFetch {
        uint80 roundId;
        uint256 answer;
        uint256 timestamp;
    }

    function initialize(address _ac, address _aggregator) external;

    function changeAggregator(address _aggregator) external;

    function fetchDataInBase18() external returns (uint256 answer);

    function getDataInBase18() external view returns (uint256 answer);

    function lastRecordedDataFetch()
        external
        view
        returns (RecordedDataFetch memory);
}
