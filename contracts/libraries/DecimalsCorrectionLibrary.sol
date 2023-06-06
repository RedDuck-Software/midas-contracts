// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library DecimalsCorrectionLibrary {
    function convert(
        uint256 originalAmount,
        uint256 originalDecimals,
        uint256 decidedDecimals
    ) internal pure returns (uint256) {
        if (originalAmount == 0) return 0;
        if (originalDecimals == decidedDecimals) return originalAmount;

        uint256 adjustedAmount;

        if (originalDecimals > decidedDecimals) {
            adjustedAmount =
                originalAmount /
                (10 ** (originalDecimals - decidedDecimals));
        } else if (originalDecimals < decidedDecimals) {
            adjustedAmount =
                originalAmount *
                (10 ** (decidedDecimals - originalDecimals));
        }

        return adjustedAmount;
    }

    function convertFromBase18(
        uint256 originalAmount,
        uint256 decidedDecimals
    ) internal pure returns (uint256) {
        return convert(originalAmount, 18, decidedDecimals);
    }

    function convertToBase18(
        uint256 originalAmount,
        uint256 originalDecimals
    ) internal pure returns (uint256) {
        return convert(originalAmount, originalDecimals, 18);
    }
}
