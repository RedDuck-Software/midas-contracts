// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";
import "../interfaces/IDataFeed.sol";

contract DataFeed is WithMidasAccessControl, IDataFeed {
    using DecimalCorrectionLibrary for uint256;
    AggregatorV3Interface public aggregator;

    IDataFeed.RecordedDataFetch public _lastRecordedDataFetch;

    function initialize(address _ac, address _aggregator) external initializer {
        __WithMidasAccessControl_init(_ac);
        aggregator = AggregatorV3Interface(_aggregator);
    }

    function changeAggregator(
        address _aggregator
    ) external onlyRole(DEFAULT_ADMIN_ROLE, msg.sender) {
        require(_aggregator != address(0), "DF: invalid address");
        
        aggregator = AggregatorV3Interface(_aggregator);
}

    function fetchDataInBase18() external returns (uint256 answer) {
        (uint80 roundId, uint256 _answer) = _getDataInBase18();
        answer = _answer;

        _lastRecordedDataFetch = RecordedDataFetch(
            roundId,
            answer,
            block.timestamp
        );
    }

    function getDataInBase18() external view returns (uint256 answer) {
        (, answer) = _getDataInBase18();
    }

    function lastRecordedDataFetch()
        external
        view
        returns (IDataFeed.RecordedDataFetch memory)
    {
        return _lastRecordedDataFetch;
    }

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
