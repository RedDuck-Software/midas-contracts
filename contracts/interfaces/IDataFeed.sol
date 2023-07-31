// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title IDataFeed
 * @author RedDuck Software
 */
interface IDataFeed {
    struct RecordedDataFetch {
        uint80 roundId;
        uint256 answer;
        uint256 timestamp;
    }

    /**
     * @notice upgradeable patter contract`s initializer
     * @param _ac MidasAccessControl contract address
     * @param _aggregator Agg   regatorV3Interface contract address
     */
    function initialize(address _ac, address _aggregator) external;

    /**
     * @notice updates `aggregator` address
     * @param _aggregator new AggregatorV3Interface contract address
     */
    function changeAggregator(address _aggregator) external;

    /**
     * @notice saves latest aggregator answer to storage and returns it
     * @return answer fetched aggregator answer
     */
    function fetchDataInBase18() external returns (uint256 answer);

    /**
     * @notice fetches answer from aggregator
     * and converts it to the base18 precision
     * @return answer fetched aggregator answer
     */
    function getDataInBase18() external view returns (uint256 answer);

    /**
     * @notice returns last data saved via fetchDataInBase18()
     * @return answer stored fetch object
     */
    function lastRecordedDataFetch()
        external
        view
        returns (RecordedDataFetch memory);
}
