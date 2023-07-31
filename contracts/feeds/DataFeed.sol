// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";
import "../interfaces/IDataFeed.sol";

/**
 * @title DataFeed
 * @notice Wrapper of ChainLink`s AggregatorV3 data feeds
 * @author RedDuck Software
 */
contract DataFeed is WithMidasAccessControl, IDataFeed {
    using DecimalsCorrectionLibrary for uint256;
    AggregatorV3Interface public aggregator;

    /**
     * @notice checks that a given `account`
     * have GREENLISTED_ROLE
     */
    IDataFeed.RecordedDataFetch public _lastRecordedDataFetch;

    /**
     * @notice upgradeable patter contract`s initializer
     * @param _ac MidasAccessControl contract address
     * @param _aggregator AggregatorV3Interface contract address
     */
    function initialize(address _ac, address _aggregator) external initializer {
        __WithMidasAccessControl_init(_ac);
        aggregator = AggregatorV3Interface(_aggregator);
    }

    /**
     * @notice updates `aggregator` address
     * @param _aggregator new AggregatorV3Interface contract address
     */
    function changeAggregator(
        address _aggregator
    ) external onlyRole(DEFAULT_ADMIN_ROLE, msg.sender) {
        require(_aggregator != address(0), "DF: invalid address");

        aggregator = AggregatorV3Interface(_aggregator);
    }

    /**
     * @notice saves latest aggregator answer to storage and returns it
     * @return answer fetched aggregator answer
     */
    function fetchDataInBase18() external returns (uint256 answer) {
        (uint80 roundId, uint256 _answer) = _getDataInBase18();
        answer = _answer;

        _lastRecordedDataFetch = RecordedDataFetch(
            roundId,
            answer,
            block.timestamp
        );
    }

    /**
     * @notice fetches answer from aggregator
     * and converts it to the base18 precision
     * @return answer fetched aggregator answer
     */
    function getDataInBase18() external view returns (uint256 answer) {
        (, answer) = _getDataInBase18();
    }

    /**
     * @notice returns last data saved via fetchDataInBase18()
     * @return answer stored fetch object
     */
    function lastRecordedDataFetch()
        external
        view
        returns (IDataFeed.RecordedDataFetch memory)
    {
        return _lastRecordedDataFetch;
    }

    /**
     * @dev fetches answer from aggregator
     * and converts it to the base18 precision
     * @return roundId fetched aggregator answer roundId
     * @return answer fetched aggregator answer
     */
    function _getDataInBase18()
        private
        view
        returns (uint80 roundId, uint256 answer)
    {
        uint8 decimals = aggregator.decimals();
        (uint80 _roundId, int256 _answer, , , ) = aggregator.latestRoundData();
        roundId = _roundId;
        answer = uint256(_answer).convertToBase18(decimals);
    }
}
