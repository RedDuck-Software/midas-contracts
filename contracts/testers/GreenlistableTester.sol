// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../access/Greenlistable.sol";

contract GreenlistableTester is Greenlistable {
    constructor(address _accessControl) Greenlistable(_accessControl) {}

    function onlyGreenlistedTester(
        address account
    ) external onlyGreenlisted(account) {}
}
