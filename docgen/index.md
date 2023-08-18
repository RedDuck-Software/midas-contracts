# Solidity API

## DepositVault

Smart contract that handles stUSD minting

### DepositRequest

```solidity
struct DepositRequest {
  address user;
  address tokenIn;
  uint256 amountUsdIn;
  uint256 fee;
  bool exists;
}
```

### minAmountToDepositInEuro

```solidity
uint256 minAmountToDepositInEuro
```

minimal USD deposit amount in EUR

### eurUsdDataFeed

```solidity
contract IDataFeed eurUsdDataFeed
```

EUR/USD data feed

### totalDeposited

```solidity
mapping(address => uint256) totalDeposited
```

depositor address => amount deposited

### requests

```solidity
mapping(uint256 => struct DepositVault.DepositRequest) requests
```

stores requests id for deposit requests created by user
deleted when request is fulfilled or cancelled by permissioned actor

_requestId => DepositRequest_

### lastRequestId

```solidity
struct Counters.Counter lastRequestId
```

last deposit request id

### isFreeFromMinDeposit

```solidity
mapping(address => bool) isFreeFromMinDeposit
```

users restricted from depositin minDepositAmountInEuro

### initialize

```solidity
function initialize(address _ac, address _stUSD, address _etfDataFeed, address _eurUsdDataFeed, uint256 _minAmountToDepositInEuro) external
```

upgradeable patter contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _stUSD | address | address of stUSD token |
| _etfDataFeed | address | address of CL`s data feed IB01/USD |
| _eurUsdDataFeed | address | address of CL`s data feed EUR/USD |
| _minAmountToDepositInEuro | uint256 | init. value for minUsdAmountToRedeem |

### initiateDepositRequest

```solidity
function initiateDepositRequest(address tokenIn, uint256 amountUsdIn) external returns (uint256)
```

deposits USD token into vault and mints
stUSD using the DataFeed price

_transfers `tokenIn` from msg.sender and mints
stUSD according to ETF data feed price_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of USD token in |
| amountUsdIn | uint256 |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

### fulfillDepositRequest

```solidity
function fulfillDepositRequest(uint256 requestId, uint256 amountStUsdOut) external
```

mints stUSD to a `user` and doesnt transfer USD
from a `user`.
can be called only from permissioned actor.

_mints stUSD according to ETF data feed price_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |
| amountStUsdOut | uint256 | amount of stUSD calculated by admin |

### cancelDepositRequest

```solidity
function cancelDepositRequest(uint256 requestId) external
```

cancels deposit request by a given `requestId`.
can be called only from permissioned actor

_deletes request by a given `requestId` from storage
and fires the event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |

### manuallyDeposit

```solidity
function manuallyDeposit(address user, address tokenIn, uint256 amountUsdIn) external returns (uint256 amountStUsdOut)
```

mints stUSD to user.
can be called only from permissioned actor

_`tokenIn` amount is calculated using ETF data feed answer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenIn | address | address of input USD token |
| amountUsdIn | uint256 | amount of stUSD to send to user |

### manuallyDeposit

```solidity
function manuallyDeposit(address user, address tokenIn, uint256 amountUsdIn, uint256 amountStUsdOut) external
```

mints stUSD to user.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenIn | address | address of inout USD token |
| amountUsdIn | uint256 | amount of USD to deposit |
| amountStUsdOut | uint256 | amount of stUSD token to send to user |

### freeFromMinDeposit

```solidity
function freeFromMinDeposit(address user) external
```

### setMinAmountToDeposit

```solidity
function setMinAmountToDeposit(uint256 newValue) external
```

sets new minimal amount to deposit.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new min. deposit value |

### getOutputAmountWithFee

```solidity
function getOutputAmountWithFee(uint256 amountUsdIn, address token) external view returns (uint256)
```

returns output amount from a given amount

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

### minAmountToDepositInUsd

```solidity
function minAmountToDepositInUsd() public view returns (uint256)
```

minAmountToDepositInEuro in USD in base18

### getFee

```solidity
function getFee(address token) public view returns (uint256)
```

returns vault fee

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | fee fee |

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _fullfillDepositRequest

```solidity
function _fullfillDepositRequest(uint256 requestId, address user, uint256 amountStUsdOut) internal
```

deposits USD `tokenIn` into vault and mints given `amountStUsdOut amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |
| user | address | user address |
| amountStUsdOut | uint256 | amount of stUSD that should be minted to user |

### _getOutputAmountWithFee

```solidity
function _getOutputAmountWithFee(uint256 amountUsdIn, address token) internal view returns (uint256)
```

_returns how much stUSD user should receive from USD inputted_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountUsdIn | uint256 | amount of USD |
| token | address |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | outputStUsd amount of stUSD that should be minted to user |

### _validateAmountUsdIn

```solidity
function _validateAmountUsdIn(address user, uint256 amountUsdIn) internal view
```

_validates that inputted USD amount >= minAmountToDepositInUsd()_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| amountUsdIn | uint256 | amount of USD |

### _manuallyDeposit

```solidity
function _manuallyDeposit(address user, address tokenIn, uint256 amountUsdIn, uint256 amountStUsdOut) internal
```

### _getRequest

```solidity
function _getRequest(uint256 requestId) internal view returns (struct DepositVault.DepositRequest request)
```

_checks that request is exists and copies it to memory_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct DepositVault.DepositRequest | request object |

## RedemptionVault

Smart contract that handles stUSD redemptions

### RedemptionRequest

```solidity
struct RedemptionRequest {
  address user;
  address tokenOut;
  uint256 amountStUsdIn;
  uint256 fee;
  bool exists;
}
```

### requests

```solidity
mapping(uint256 => struct RedemptionVault.RedemptionRequest) requests
```

stores requests id for redemption requests created by user
deleted when request is fulfilled or cancelled by permissioned actor

_requestId => RedemptionRequest_

### lastRequestId

```solidity
struct Counters.Counter lastRequestId
```

counter for request ids

### minUsdAmountToRedeem

```solidity
uint256 minUsdAmountToRedeem
```

min. amount of USD that should be redeemed from stUSD

_min. amount should be validated only in request initiation_

### initialize

```solidity
function initialize(address _ac, address _stUSD, address _etfDataFeed, uint256 _minUsdAmountToRedeem) external
```

upgradeable patter contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _stUSD | address | address of stUSD token |
| _etfDataFeed | address | address of CL`s data feed IB01/USD |
| _minUsdAmountToRedeem | uint256 | init. value for minUsdAmountToRedeem |

### initiateRedemptionRequest

```solidity
function initiateRedemptionRequest(address tokenOut, uint256 amountStUsdIn) external returns (uint256 requestId)
```

creates a stUSD redemption request.
its a first step of stUSD redemption process

_burns 'amountStUsdIn' amount from user
and saves redemption request to the storage_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountStUsdIn | uint256 | amount of stUSD to redeem |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of created request |

### fulfillRedemptionRequest

```solidity
function fulfillRedemptionRequest(uint256 requestId, uint256 amountUsdOut) external
```

fulfills redemption request by a given `requestId`.
can be called only from permissioned actor

_deletes request by a given `requestId` from storage,
transfers `amountUsdOut` to user. USD token balance of the vault
should be sufficient to make the transfer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a redemption request |
| amountUsdOut | uint256 | amount of USD token to transfer to user |

### cancelRedemptionRequest

```solidity
function cancelRedemptionRequest(uint256 requestId) external
```

cancels redemption request by a given `requestId`.
can be called only from permissioned actor

_deletes request by a given `requestId` from storage
and fires the event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a redemption request |

### manuallyRedeem

```solidity
function manuallyRedeem(address user, address tokenOut, uint256 amountStUsdIn) external returns (uint256 amountUsdOut)
```

burns stUSD and transfers `tokenOut` to the user.
can be called only from permissioned actor

_`tokenOut` amount is calculated using ETF data feed answer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenOut | address | address of output USD token |
| amountStUsdIn | uint256 | amount of stUSD to redeem |

### manuallyRedeem

```solidity
function manuallyRedeem(address user, address tokenOut, uint256 amountStUsdIn, uint256 amountUsdOut) external
```

burns stUSD and transfers `amountUsdOut` of `tokenOut` to the user.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenOut | address | address of output USD token |
| amountStUsdIn | uint256 | amount of stUSD to redeem |
| amountUsdOut | uint256 | amount of USD token to send to user |

### setMinAmountToRedeem

```solidity
function setMinAmountToRedeem(uint256 newValue) external
```

updates `minUsdAmountToRedeem` storage value.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new value of `minUsdAmountToRedeem` |

### getOutputAmountWithFee

```solidity
function getOutputAmountWithFee(uint256 amountIn, address token) external view returns (uint256 amountOut)
```

returns output USD amount from a given stUSD amount

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | output USD amount |

### getFee

```solidity
function getFee(address token) public view returns (uint256)
```

returns redemption fee

_fee applies to output USD amount_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | fee USD fee |

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _getRequest

```solidity
function _getRequest(uint256 requestId) internal view returns (struct RedemptionVault.RedemptionRequest request)
```

_checks that request is exists and copies it to memory_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct RedemptionVault.RedemptionRequest | request object |

### _fulfillRedemptionRequest

```solidity
function _fulfillRedemptionRequest(struct RedemptionVault.RedemptionRequest request, uint256 requestId, uint256 amountUsdOut) internal
```

_deletes request from storage, transfers USD token to user
and fires the event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct RedemptionVault.RedemptionRequest | request object |
| requestId | uint256 | id of the request object |
| amountUsdOut | uint256 | amount of USD token to transfer to user |

### _manuallyRedeem

```solidity
function _manuallyRedeem(address user, address tokenOut, uint256 amountStUsdIn, uint256 amountUsdOut) internal
```

_burn `amountStUsdIn` amount of stUSd from `user`
and transfers `amountUsdOut` amount of `tokenOut` to `user`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| tokenOut | address | address of output USD token |
| amountStUsdIn | uint256 | amount of stUSD token to burn from `user` |
| amountUsdOut | uint256 | amount of USD token to transfer to `user` |

### _transferToken

```solidity
function _transferToken(address user, address token, uint256 amount) internal
```

_do safe transfer on a given token. Doesnt perform transfer if
token is `MANUAL_FULLFILMENT_TOKEN` as it should be transfered off-chain_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| token | address | address of token |
| amount | uint256 | amount of `token` to transfer to `user` |

### _getOutputAmountWithFee

```solidity
function _getOutputAmountWithFee(uint256 amountStUsdIn, address token) internal view returns (uint256)
```

_calculates output USD amount based on ETF data feed answer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountStUsdIn | uint256 | amount of stUSD token |
| token | address |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amountUsdOut amount with fee of output USD token |

### _validateAmountUsdOut

```solidity
function _validateAmountUsdOut(uint256 amount) internal view
```

_validates that provided `amount` is >= `minUsdAmountToRedeem`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | amount of USD token |

### _requireTokenExists

```solidity
function _requireTokenExists(address token) internal view
```

_checks that provided `token` is supported by the vault_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

## ManageableVault

### MANUAL_FULLFILMENT_TOKEN

```solidity
address MANUAL_FULLFILMENT_TOKEN
```

address that represents off-chain USD bank transfer

### PERCENTAGE_BPS

```solidity
uint256 PERCENTAGE_BPS
```

base points for percentage calculation

_for example, 100% will be (100 * PERCENTAGE_BPS)%_

### etfDataFeed

```solidity
contract IDataFeed etfDataFeed
```

IBO1/USD ChainLink data feed

### stUSD

```solidity
contract IStUSD stUSD
```

stUSD token

### _paymentTokens

```solidity
struct EnumerableSetUpgradeable.AddressSet _paymentTokens
```

_tokens that can be used as USD representation_

### _feesForTokens

```solidity
mapping(address => uint256) _feesForTokens
```

_fees for different tokens_

### onlyVaultAdmin

```solidity
modifier onlyVaultAdmin()
```

_checks that msg.sender do have a vaultRole() role_

### __ManageableVault_init

```solidity
function __ManageableVault_init(address _ac, address _stUSD, address _etfDataFeed) internal
```

_upgradeable patter contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _stUSD | address | address of stUSD token |
| _etfDataFeed | address | address of CL`s data feed IB01/USD |

### withdrawToken

```solidity
function withdrawToken(address token, uint256 amount, address withdrawTo) external
```

withdraws `amoount` of a given `token` from the contract.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| amount | uint256 | token amount |
| withdrawTo | address | withdraw destination address |

### addPaymentToken

```solidity
function addPaymentToken(address token) external
```

adds a token to `_paymentTokens`.
can be called only from permissioned actor.

_reverts if token is already added_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### removePaymentToken

```solidity
function removePaymentToken(address token) external
```

removes a token from `_paymentTokens`.
can be called only from permissioned actor.

_reverts if token is not presented_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### setFee

```solidity
function setFee(address token, uint256 newFee) external
```

sets new `_fee` value
can be called only from permissioned actor.

_reverts is token is not presented_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address |  |
| newFee | uint256 | token address |

### getPaymentTokens

```solidity
function getPaymentTokens() external view returns (address[])
```

returns array of `_paymentTokens`
can be called only from permissioned actor.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | paymentTokens array of payment tokens |

### vaultRole

```solidity
function vaultRole() public view virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### pauseAdminRole

```solidity
function pauseAdminRole() public view returns (bytes32)
```

_virtual function to determine pauseAdmin role_

### _tokenTransferFrom

```solidity
function _tokenTransferFrom(address user, address token, uint256 amount) internal
```

_do safe transfer from on a given token
and converts amount from base18 to amount for a given token_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| token | address | address of token |
| amount | uint256 | amount of `token` to transfer to `user` |

### _tokenDecimals

```solidity
function _tokenDecimals(address token) internal view returns (uint8)
```

_retreives decimals of a given `token`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | decimals decinmals value of a given `token` |

### _requireTokenExists

```solidity
function _requireTokenExists(address token) internal view virtual
```

_checks that `token` is presented in `_paymentTokens`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |

## Blacklistable

Base contract that implements basic functions and modifiers
to work with blacklistable

### onlyNotBlacklisted

```solidity
modifier onlyNotBlacklisted(address account)
```

_checks that a given `account` doesnt
have BLACKLISTED_ROLE_

### __Blacklistable_init

```solidity
function __Blacklistable_init(address _accessControl) internal
```

_upgradeable patter contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | MidasAccessControl contract address |

## Greenlistable

Base contract that implements basic functions and modifiers
to work with greenlistable

### onlyGreenlisted

```solidity
modifier onlyGreenlisted(address account)
```

_checks that a given `account`
have GREENLISTED_ROLE_

### __Greenlistable_init

```solidity
function __Greenlistable_init(address _accessControl) internal
```

_upgradeable patter contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | MidasAccessControl contract address |

## MidasAccessControl

Smart contract that stores all roles for Midas project

### initialize

```solidity
function initialize() external
```

upgradeable patter contract`s initializer

### grantRoleMult

```solidity
function grantRoleMult(bytes32[] roles, address[] addresses) external
```

grant multiple roles to multiple users
in one transaction

_length`s of 2 arays should match_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | array of bytes32 roles |
| addresses | address[] | array of user addresses |

### revokeRoleMult

```solidity
function revokeRoleMult(bytes32[] roles, address[] addresses) external
```

revoke multiple roles from multiple users
in one transaction

_length`s of 2 arays should match_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | array of bytes32 roles |
| addresses | address[] | array of user addresses |

## MidasAccessControlRoles

Base contract that stores all roles descriptors

### GREENLIST_OPERATOR_ROLE

```solidity
bytes32 GREENLIST_OPERATOR_ROLE
```

actor that can change green list statuses of addresses

### BLACKLIST_OPERATOR_ROLE

```solidity
bytes32 BLACKLIST_OPERATOR_ROLE
```

actor that can change black list statuses of addresses

### ST_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 ST_USD_MINT_OPERATOR_ROLE
```

actor that can mint stUSD

### ST_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 ST_USD_BURN_OPERATOR_ROLE
```

actor that can burn stUSD

### ST_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 ST_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause stUSD

### DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 DEPOSIT_VAULT_ADMIN_ROLE
```

actor that have admin rights in deposit vault

### REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 REDEMPTION_VAULT_ADMIN_ROLE
```

actor that have admin rights in redemption vault

### GREENLISTED_ROLE

```solidity
bytes32 GREENLISTED_ROLE
```

actor that is greenlisted

### BLACKLISTED_ROLE

```solidity
bytes32 BLACKLISTED_ROLE
```

actor that is blacklisted

## Pausable

Base contract that implements basic functions and modifiers
with pause functionality

### pausable

```solidity
modifier pausable()
```

_checks if contract is on pause_

### onlyPauseAdmin

```solidity
modifier onlyPauseAdmin()
```

_checks that a given `account`
has a determinedPauseAdminRole_

### __Pausable_init

```solidity
function __Pausable_init(address _accessControl) internal
```

_upgradeable patter contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | MidasAccessControl contract address |

### changePauseState

```solidity
function changePauseState(bool newState) public
```

_upgradeable patter contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newState | bool | is new pause state |

### getIsOnPause

```solidity
function getIsOnPause() external view returns (bool)
```

_returns isOnPause property_

### pauseAdminRole

```solidity
function pauseAdminRole() public view virtual returns (bytes32)
```

_virtual function to determine pauseAdmin role_

### _pausable

```solidity
function _pausable() internal view
```

_checks if user has pauseAdmin role and if not,
requires to be unpaused_

## WithMidasAccessControl

Base contract that consumes MidasAccessControl

### DEFAULT_ADMIN_ROLE

```solidity
bytes32 DEFAULT_ADMIN_ROLE
```

admin role

### accessControl

```solidity
contract MidasAccessControl accessControl
```

MidasAccessControl contract address

### onlyRole

```solidity
modifier onlyRole(bytes32 role, address account)
```

_checks that given `address` have `role`_

### onlyNotRole

```solidity
modifier onlyNotRole(bytes32 role, address account)
```

_checks that given `address` do not have `role`_

### __WithMidasAccessControl_init

```solidity
function __WithMidasAccessControl_init(address _accessControl) internal
```

_upgradeable patter contract`s initializer_

### _onlyRole

```solidity
function _onlyRole(bytes32 role, address account) internal view
```

_checks that given `address` have `role`_

### _onlyNotRole

```solidity
function _onlyNotRole(bytes32 role, address account) internal view
```

_checks that given `address` do not have `role`_

## DataFeed

Wrapper of ChainLink`s AggregatorV3 data feeds

### aggregator

```solidity
contract AggregatorV3Interface aggregator
```

AggregatorV3Interface contract address

### initialize

```solidity
function initialize(address _ac, address _aggregator) external
```

upgradeable patter contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | MidasAccessControl contract address |
| _aggregator | address | Agg   regatorV3Interface contract address |

### changeAggregator

```solidity
function changeAggregator(address _aggregator) external
```

updates `aggregator` address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _aggregator | address | new AggregatorV3Interface contract address |

### fetchDataInBase18

```solidity
function fetchDataInBase18() external returns (uint256 answer)
```

saves latest aggregator answer to storage and returns it

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | fetched aggregator answer |

### getDataInBase18

```solidity
function getDataInBase18() external view returns (uint256 answer)
```

fetches answer from aggregator
and converts it to the base18 precision

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | fetched aggregator answer |

### lastRecordedDataFetch

```solidity
function lastRecordedDataFetch() external view returns (struct IDataFeed.RecordedDataFetch)
```

returns last data saved via fetchDataInBase18()

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IDataFeed.RecordedDataFetch | answer stored fetch object |

## IDataFeed

### RecordedDataFetch

```solidity
struct RecordedDataFetch {
  uint80 roundId;
  uint256 answer;
  uint256 timestamp;
}
```

### initialize

```solidity
function initialize(address _ac, address _aggregator) external
```

upgradeable patter contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | MidasAccessControl contract address |
| _aggregator | address | Agg   regatorV3Interface contract address |

### changeAggregator

```solidity
function changeAggregator(address _aggregator) external
```

updates `aggregator` address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _aggregator | address | new AggregatorV3Interface contract address |

### fetchDataInBase18

```solidity
function fetchDataInBase18() external returns (uint256 answer)
```

saves latest aggregator answer to storage and returns it

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | fetched aggregator answer |

### getDataInBase18

```solidity
function getDataInBase18() external view returns (uint256 answer)
```

fetches answer from aggregator
and converts it to the base18 precision

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | fetched aggregator answer |

### lastRecordedDataFetch

```solidity
function lastRecordedDataFetch() external view returns (struct IDataFeed.RecordedDataFetch)
```

returns last data saved via fetchDataInBase18()

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IDataFeed.RecordedDataFetch | answer stored fetch object |

## IDepositVault

### SetMinAmountToDeposit

```solidity
event SetMinAmountToDeposit(address caller, uint256 newValue)
```

### initiateDepositRequest

```solidity
function initiateDepositRequest(address tokenIn, uint256 amountIn) external returns (uint256 amountOut)
```

deposits USD token into vault and mints
stUSD using the DataFeed price

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of USD token in |
| amountIn | uint256 | amount of `tokenIn` that will be taken from user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | amount of stUSD that minted to user |

### fulfillDepositRequest

```solidity
function fulfillDepositRequest(uint256 requestId, uint256 amountStUsdOut) external
```

mints stUSD to a `user` and doesnt transfer USD
from a `user`.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |
| amountStUsdOut | uint256 | amount of stUSD calculated by admin |

### cancelDepositRequest

```solidity
function cancelDepositRequest(uint256 requestId) external
```

cancels deposit request by a given `requestId`.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |

### manuallyDeposit

```solidity
function manuallyDeposit(address user, address tokenIn, uint256 amountUsdIn) external returns (uint256 amountUsdOut)
```

mints stUSD to user.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenIn | address | address of input USD token |
| amountUsdIn | uint256 | amount of stUSD to send to user |

### manuallyDeposit

```solidity
function manuallyDeposit(address user, address tokenIn, uint256 amountUsdIn, uint256 amountStUsdOut) external
```

mints stUSD to user.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenIn | address | address of inout USD token |
| amountUsdIn | uint256 | amount of USD to deposit |
| amountStUsdOut | uint256 | amount of stUSD token to send to user |

### setMinAmountToDeposit

```solidity
function setMinAmountToDeposit(uint256 newValue) external
```

sets new minimal amount to deposit.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new min. deposit value |

## IManageableVault

### WithdrawToken

```solidity
event WithdrawToken(address caller, address token, address withdrawTo, uint256 amount)
```

### AddPaymentToken

```solidity
event AddPaymentToken(address token, address caller)
```

### RemovePaymentToken

```solidity
event RemovePaymentToken(address token, address caller)
```

### SetFee

```solidity
event SetFee(address caller, address token, uint256 newFee)
```

### InitiateRequest

```solidity
event InitiateRequest(uint256 requestId, address user, address token, uint256 amount)
```

### FulfillRequest

```solidity
event FulfillRequest(address caller, uint256 requestId, uint256 amountOut)
```

### CancelRequest

```solidity
event CancelRequest(uint256 requestId)
```

### PerformManualAction

```solidity
event PerformManualAction(address caller, address user, address token, uint256 amountStUsd, uint256 amountUsd)
```

### FeeCollected

```solidity
event FeeCollected(uint256 requestId, address user, uint256 feeAmount)
```

### withdrawToken

```solidity
function withdrawToken(address token, uint256 amount, address withdrawTo) external
```

withdraws `amoount` of a given `token` from the contract.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| amount | uint256 | token amount |
| withdrawTo | address | withdraw destination address |

### addPaymentToken

```solidity
function addPaymentToken(address token) external
```

adds a token to `_paymentTokens`.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### removePaymentToken

```solidity
function removePaymentToken(address token) external
```

removes a token from `_paymentTokens`.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### setFee

```solidity
function setFee(address token, uint256 newFee) external
```

sets new `_fee` value
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address |  |
| newFee | uint256 | token address |

### getOutputAmountWithFee

```solidity
function getOutputAmountWithFee(uint256 amountIn, address token) external view returns (uint256 amountOut)
```

returns output amount from a given amount

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | output amount |

### getFee

```solidity
function getFee(address token) external view returns (uint256)
```

returns vault fee

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | fee fee |

## IPausable

### ChangeState

```solidity
event ChangeState(bool newState)
```

## IRedemptionVault

### SetMinAmountToRedeem

```solidity
event SetMinAmountToRedeem(address caller, uint256 newValue)
```

### initiateRedemptionRequest

```solidity
function initiateRedemptionRequest(address tokenOut, uint256 amountStUsdIn) external returns (uint256 requestId)
```

creates a stUSD redemption request.
its a first step of stUSD redemption process

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountStUsdIn | uint256 | amount of stUSD to redeem |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of created request |

### fulfillRedemptionRequest

```solidity
function fulfillRedemptionRequest(uint256 requestId, uint256 amountUsdOut) external
```

fulfills redemption request by a given `requestId`.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a redemption request |
| amountUsdOut | uint256 | amount of USD token to transfer to user |

### cancelRedemptionRequest

```solidity
function cancelRedemptionRequest(uint256 requestId) external
```

cancels redemption request by a given `requestId`.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a redemption request |

### manuallyRedeem

```solidity
function manuallyRedeem(address user, address tokenOut, uint256 amountStUsdIn) external returns (uint256 amountUsdOut)
```

burns stUSD and transfers `tokenOut` to the user.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenOut | address | address of output USD token |
| amountStUsdIn | uint256 | amount of stUSD to redeem |

### manuallyRedeem

```solidity
function manuallyRedeem(address user, address tokenOut, uint256 amountStUsdIn, uint256 amountUsdOut) external
```

burns stUSD and transfers `amountUsdOut` of `tokenOut` to the user.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenOut | address | address of output USD token |
| amountStUsdIn | uint256 | amount of stUSD to redeem |
| amountUsdOut | uint256 | amount of USD token to send to user |

### setMinAmountToRedeem

```solidity
function setMinAmountToRedeem(uint256 newValue) external
```

updates `minUsdAmountToRedeem` storage value.
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new value of `minUsdAmountToRedeem` |

## IStUSD

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints stUSD token `amount` to a given `to` address.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | addres to mint tokens to |
| amount | uint256 | amount to mint |

### burn

```solidity
function burn(address from, uint256 amount) external
```

burns stUSD token `amount` to a given `to` address.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | addres to burn tokens from |
| amount | uint256 | amount to burn |

### setMetadata

```solidity
function setMetadata(bytes32 key, bytes data) external
```

updates contract`s metadata.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | metadata map. key |
| data | bytes | metadata map. value |

### pause

```solidity
function pause() external
```

puts stUSD token on pause.
should be called only from permissioned actor

### unpause

```solidity
function unpause() external
```

puts stUSD token on pause.
should be called only from permissioned actor

## DecimalsCorrectionLibrary

### convert

```solidity
function convert(uint256 originalAmount, uint256 originalDecimals, uint256 decidedDecimals) internal pure returns (uint256)
```

_converts `originalAmount` with `originalDecimals` into
amount with `decidedDecimals`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| originalAmount | uint256 | amount to convert |
| originalDecimals | uint256 | decimals of the original amount |
| decidedDecimals | uint256 | decimals for the output amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount converted amount with `decidedDecimals` |

### convertFromBase18

```solidity
function convertFromBase18(uint256 originalAmount, uint256 decidedDecimals) internal pure returns (uint256)
```

_converts `originalAmount` with decimals 18 into
amount with `decidedDecimals`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| originalAmount | uint256 | amount to convert |
| decidedDecimals | uint256 | decimals for the output amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount converted amount with `decidedDecimals` |

### convertToBase18

```solidity
function convertToBase18(uint256 originalAmount, uint256 originalDecimals) internal pure returns (uint256)
```

_converts `originalAmount` with `originalDecimals` into
amount with decimals 18_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| originalAmount | uint256 | amount to convert |
| originalDecimals | uint256 | decimals of the original amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount converted amount with 18 decimals |

## AggregatorV3Mock

### _latestRoundData

```solidity
int256 _latestRoundData
```

### _latestRoundId

```solidity
uint80 _latestRoundId
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### description

```solidity
function description() external view returns (string)
```

### version

```solidity
function version() external view returns (uint256)
```

### setRoundData

```solidity
function setRoundData(int256 _data) external
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## ERC20Mock

### constructor

```solidity
constructor(uint8 decimals_) public
```

### mint

```solidity
function mint(address to, uint256 amount) external
```

### decimals

```solidity
function decimals() public view returns (uint8)
```

_Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the value {ERC20} uses, unless this function is
overridden;

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}._

## ERC20MockWithName

### constructor

```solidity
constructor(uint8 decimals_, string name, string symb) public
```

### mint

```solidity
function mint(address to, uint256 amount) external
```

### decimals

```solidity
function decimals() public view returns (uint8)
```

_Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the value {ERC20} uses, unless this function is
overridden;

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}._

## stUSD

### TERMS_URL_METADATA_KEY

```solidity
bytes32 TERMS_URL_METADATA_KEY
```

default terms url metadata encoded key

### DESCRIPTION_URL_METADATA_KEY

```solidity
bytes32 DESCRIPTION_URL_METADATA_KEY
```

default description url metadata encoded key

### metadata

```solidity
mapping(bytes32 => bytes) metadata
```

metadata key => metadata value

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable patter contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints stUSD token `amount` to a given `to` address.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | addres to mint tokens to |
| amount | uint256 | amount to mint |

### burn

```solidity
function burn(address from, uint256 amount) external
```

burns stUSD token `amount` to a given `to` address.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | addres to burn tokens from |
| amount | uint256 | amount to burn |

### pause

```solidity
function pause() external
```

puts stUSD token on pause.
should be called only from permissioned actor

### unpause

```solidity
function unpause() external
```

puts stUSD token on pause.
should be called only from permissioned actor

### setMetadata

```solidity
function setMetadata(bytes32 key, bytes data) external
```

updates contract`s metadata.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | metadata map. key |
| data | bytes | metadata map. value |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual
```

_overrrides _beforeTokenTransfer function to ban
blaclisted users from using the token functions_

## BlacklistableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### onlyNotBlacklistedTester

```solidity
function onlyNotBlacklistedTester(address account) external
```

## DecimalsCorrectionTester

### convertAmountFromBase18Public

```solidity
function convertAmountFromBase18Public(uint256 amount, uint256 decimals) public pure returns (uint256)
```

### convertAmountToBase18Public

```solidity
function convertAmountToBase18Public(uint256 amount, uint256 decimals) public pure returns (uint256)
```

## GreenlistableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### onlyGreenlistedTester

```solidity
function onlyGreenlistedTester(address account) external
```

## PausableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### pauseAdminRole

```solidity
function pauseAdminRole() public view returns (bytes32)
```

_virtual function to determine pauseAdmin role_

## WithMidasAccessControlTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### grantRoleTester

```solidity
function grantRoleTester(bytes32 role, address account) external
```

### revokeRoleTester

```solidity
function revokeRoleTester(bytes32 role, address account) external
```

### withOnlyRole

```solidity
function withOnlyRole(bytes32 role, address account) external
```

### withOnlyNotRole

```solidity
function withOnlyNotRole(bytes32 role, address account) external
```

