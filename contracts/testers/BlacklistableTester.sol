// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../access/Blacklistable.sol";

contract BlacklistableTester is Blacklistable {
    constructor(address _accessControl) Blacklistable(_accessControl) {}

    function onlyNotBlacklistedTester(
        address account
    ) external onlyNotBlacklisted(account) {}
}
