# Solidity API

## DepositVault

Smart contract that handles mTBILL minting

### DepositRequest

```solidity
struct DepositRequest {
  address user;
  address tokenIn;
  uint256 amountUsdIn;
  uint256 fee;
}
```

### minAmountToDepositInEuro

```solidity
uint256 minAmountToDepositInEuro
```

minimal USD amount in EUR for first user`s deposit

### eurUsdDataFeed

```solidity
contract IDataFeed eurUsdDataFeed
```

EUR/USD data feed

### totalDeposited

```solidity
mapping(address => uint256) totalDeposited
```

_depositor address => amount deposited_

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
function initialize(address _ac, address _mTBILL, address _eurUsdDataFeed, uint256 _minAmountToDepositInEuro) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTBILL | address | address of mTBILL token |
| _eurUsdDataFeed | address | address of CL`s data feed EUR/USD |
| _minAmountToDepositInEuro | uint256 | initial value for minAmountToDepositInEuro |

### initiateDepositRequest

```solidity
function initiateDepositRequest(address tokenIn, uint256 amountUsdIn) external returns (uint256)
```

first step of the depositing proccess.
Transfers stablecoin from the user and saves the deposit request
into the storage. Then request should be validated off-chain
and fulfilled by the vault`s admin by calling the
`fulfillDepositRequest`

_transfers `tokenIn` from msg.sender
and saves deposit request to the storage_

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
function fulfillDepositRequest(uint256 requestId, uint256 amountMTbillOut) external
```

second step of the depositing proccess.
After deposit request was validated off-chain,
admin calculates how much of mTBILL`s should be minted to the user.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |
| amountMTbillOut | uint256 | amount of mTBILL to mint |

### cancelDepositRequest

```solidity
function cancelDepositRequest(uint256 requestId) external
```

cancels the deposit request by a given `requestId`
and transfers all the tokens locked for this request back
to the user.
can be called only from vault`s admin

_reverts existing deposit request by a given `requestId`,
deletes it from the storage and fires the event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |

### manuallyDeposit

```solidity
function manuallyDeposit(address user, address tokenIn, uint256 amountUsdIn, uint256 amountMTbillOut) external
```

wrapper over the mTBILL.mint() function.
Mints `amountMTbillOut` to the `user` and emits the 
event to be able to track this deposit off-chain.
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenIn | address | address of inout USD token |
| amountUsdIn | uint256 | amount of USD to deposit |
| amountMTbillOut | uint256 | amount of mTBILL token to send to user |

### freeFromMinDeposit

```solidity
function freeFromMinDeposit(address user) external
```

frees given `user` from the minimal deposit
amount validation in `initiateDepositRequest`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |

### setMinAmountToDeposit

```solidity
function setMinAmountToDeposit(uint256 newValue) external
```

sets new minimal amount to deposit in EUR.
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new min. deposit value |

### minAmountToDepositInUsd

```solidity
function minAmountToDepositInUsd() public view returns (uint256)
```

minAmountToDepositInEuro converted to USD in base18

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
function _fullfillDepositRequest(uint256 requestId, address user, uint256 amountMTbillOut) internal
```

_removes deposit request from the storage
mints `amountMTbillOut` of mTBILL to user_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |
| user | address | user address |
| amountMTbillOut | uint256 | amount of mTBILL that should be minted to user |

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
function _manuallyDeposit(address user, address tokenIn, uint256 amountUsdIn, uint256 amountMTbillOut) internal
```

_internal implementation of manuallyDeposit()
mints `amountMTbillOut` amount of mTBILL to the `user`
and fires the event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| tokenIn | address | address of input USD token |
| amountUsdIn | uint256 | amount of USD token taken from user |
| amountMTbillOut | uint256 | amount of mTBILL token to mint to `user` |

### _getRequest

```solidity
function _getRequest(uint256 requestId) internal view returns (struct DepositVault.DepositRequest request)
```

_checks that request is exists and copies it to the memory_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct DepositVault.DepositRequest | request object |

## RedemptionVault

Smart contract that handles mTBILL redemptions

### RedemptionRequest

```solidity
struct RedemptionRequest {
  address user;
  address tokenOut;
  uint256 amountTBillIn;
  uint256 fee;
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

### initialize

```solidity
function initialize(address _ac, address _mTBILL) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTBILL | address | address of mTBILL token |

### initiateRedemptionRequest

```solidity
function initiateRedemptionRequest(address tokenOut, uint256 amountTBillIn) external returns (uint256 requestId)
```

first step of mTBILL redemption process
Burns mTBILL from the user, and saves a redemption request
into the storage. Then request should be validated off-chain
and fulfilled by the vault`s admin by calling the
`fulfillRedemptionRequest`

_burns 'amountTBillIn' amount from user
and saves redemption request to the storage_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountTBillIn | uint256 | amount of mTBILL to redeem |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of created request |

### fulfillRedemptionRequest

```solidity
function fulfillRedemptionRequest(uint256 requestId, uint256 amountUsdOut) external
```

second step of the depositing proccess.
After deposit request was validated off-chain,
admin calculates how much of USD should be transferred to the user.
can be called only from permissioned actor.

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

cancels redemption request by a given `requestId`
and mints mTBILL back to the user. 
can be called only from permissioned actor

_deletes request by a given `requestId` from storage
and fires the event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a redemption request |

### manuallyRedeem

```solidity
function manuallyRedeem(address user, address tokenOut, uint256 amountTBillIn, uint256 amountUsdOut) external
```

wrapper over the mTBILL.burn() function.
Burns `amountTBillIn` from the `user` and emits the 
event to be able to track this redemption off-chain.
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenOut | address | address of output USD token |
| amountTBillIn | uint256 | amount of mTBILL to redeem |
| amountUsdOut | uint256 | amount of USD token to send to user |

### getFee

```solidity
function getFee(address token) public view returns (uint256)
```

returns redemption fee

_fee applies to inputted mTBILL amount_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | fee fee percentage multiplied by 100 |

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
and emits the event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct RedemptionVault.RedemptionRequest | request object |
| requestId | uint256 | id of the request object |
| amountUsdOut | uint256 | amount of USD token to transfer to user |

### _manuallyRedeem

```solidity
function _manuallyRedeem(address user, address tokenOut, uint256 amountTBillIn, uint256 amountUsdOut) internal
```

_burn `amountTBillIn` amount of mTBILL from `user`
and transfers `amountUsdOut` amount of `tokenOut` to `user`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| tokenOut | address | address of output USD token |
| amountTBillIn | uint256 | amount of mTBILL token to burn from `user` |
| amountUsdOut | uint256 | amount of USD token to transfer to `user` |

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

Contract with base Vault methods

### MANUAL_FULLFILMENT_TOKEN

```solidity
address MANUAL_FULLFILMENT_TOKEN
```

address that represents off-chain USD bank transfer

### ONE_HUNDRED_PERCENT

```solidity
uint256 ONE_HUNDRED_PERCENT
```

100 percent with base 100

_for example, 10% will be (10 * 100)%_

### mTBILL

```solidity
contract IMTbill mTBILL
```

mTBILL token

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
function __ManageableVault_init(address _ac, address _mTBILL) internal
```

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTBILL | address | address of mTBILL token |

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

adds a token to the stablecoins list.
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

removes a token from stablecoins list.
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

returns array of stablecoins supported by the vault
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

AC role of vault`s pauser

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

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

### _transferToken

```solidity
function _transferToken(address user, address token, uint256 amount) internal
```

_do safe transfer on a given token. Doesnt perform transfer if
token is `MANUAL_FULLFILMENT_TOKEN` as it should be transferred off-chain_

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

## MidasInitializable

Base Initializable contract that implements constructor
that calls _disableInitializers() to prevent 
initialization of implementation contract

### constructor

```solidity
constructor() internal
```

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

_upgradeable pattern contract`s initializer_

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

_upgradeable pattern contract`s initializer_

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

upgradeable pattern contract`s initializer

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

### M_TBILL_MINT_OPERATOR_ROLE

```solidity
bytes32 M_TBILL_MINT_OPERATOR_ROLE
```

actor that can mint mTBILL

### M_TBILL_BURN_OPERATOR_ROLE

```solidity
bytes32 M_TBILL_BURN_OPERATOR_ROLE
```

actor that can burn mTBILL

### M_TBILL_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_TBILL_PAUSE_OPERATOR_ROLE
```

actor that can pause mTBILL

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

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | MidasAccessControl contract address |

### changePauseState

```solidity
function changePauseState(bool newState) public
```

_upgradeable pattern contract`s initializer_

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

_upgradeable pattern contract`s initializer_

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

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | MidasAccessControl contract address |
| _aggregator | address | AggregatorV3Interface contract address |

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

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | MidasAccessControl contract address |
| _aggregator | address | AggregatorV3Interface contract address |

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

first step of the depositing proccess.
Transfers stablecoin from the user and saves the deposit request
into the storage. Then request should be validated off-chain
and fulfilled by the vault`s admin by calling the
`fulfillDepositRequest`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of USD token in |
| amountIn | uint256 | amount of `tokenIn` that will be taken from user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | amount of mTBILL that minted to user |

### fulfillDepositRequest

```solidity
function fulfillDepositRequest(uint256 requestId, uint256 amountMTbillOut) external
```

second step of the depositing proccess.
After deposit request was validated off-chain,
admin calculates how much of mTBILL`s should be minted to the user.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |
| amountMTbillOut | uint256 | amount of mTBILL to mint |

### cancelDepositRequest

```solidity
function cancelDepositRequest(uint256 requestId) external
```

cancels the deposit request by a given `requestId`
and transfers all the tokens locked for this request back
to the user.
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a deposit request |

### manuallyDeposit

```solidity
function manuallyDeposit(address user, address tokenIn, uint256 amountUsdIn, uint256 amountMTbillOut) external
```

wrapper over the mTBILL.mint() function.
Mints `amountMTbillOut` to the `user` and emits the 
event to be able to track this deposit off-chain.
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenIn | address | address of inout USD token |
| amountUsdIn | uint256 | amount of USD to deposit |
| amountMTbillOut | uint256 | amount of mTBILL token to send to user |

### freeFromMinDeposit

```solidity
function freeFromMinDeposit(address user) external
```

frees given `user` from the minimal deposit
amount validation in `initiateDepositRequest`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |

### setMinAmountToDeposit

```solidity
function setMinAmountToDeposit(uint256 newValue) external
```

sets new minimal amount to deposit in EUR.
can be called only from vault`s admin

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

withdraws `amount` of a given `token` from the contract.
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

adds a token to the stablecoins list.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### removePaymentToken

```solidity
function removePaymentToken(address token) external
```

removes a token from stablecoins list.
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
function initiateRedemptionRequest(address tokenOut, uint256 amountTBillIn) external returns (uint256 requestId)
```

first step of mTBILL redemption process
Burns mTBILL from the user, and saves a redemption request
into the storage. Then request should be validated off-chain
and fulfilled by the vault`s admin by calling the
`fulfillRedemptionRequest`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountTBillIn | uint256 | amount of mTBILL to redeem |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of created request |

### fulfillRedemptionRequest

```solidity
function fulfillRedemptionRequest(uint256 requestId, uint256 amountUsdOut) external
```

second step of the depositing proccess.
After deposit request was validated off-chain,
admin calculates how much of USD should be transferred to the user.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a redemption request |
| amountUsdOut | uint256 | amount of USD token to transfer to user |

### cancelRedemptionRequest

```solidity
function cancelRedemptionRequest(uint256 requestId) external
```

cancels redemption request by a given `requestId`
and mints mTBILL back to the user. 
can be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | id of a redemption request |

### manuallyRedeem

```solidity
function manuallyRedeem(address user, address tokenOut, uint256 amountTBillIn, uint256 amountUsdOut) external
```

wrapper over the mTBILL.burn() function.
Burns `amountTBillIn` from the `user` and emits the 
event to be able to track this redemption off-chain.
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| tokenOut | address | address of output USD token |
| amountTBillIn | uint256 | amount of mTBILL to redeem |
| amountUsdOut | uint256 | amount of USD token to send to user |

## IMTbill

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints mTBILL token `amount` to a given `to` address.
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

burns mTBILL token `amount` to a given `to` address.
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

puts mTBILL token on pause.
should be called only from permissioned actor

### unpause

```solidity
function unpause() external
```

puts mTBILL token on pause.
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

## mTBILL

### TERMS_URL_METADATA_KEY

```solidity
bytes32 TERMS_URL_METADATA_KEY
```

default terms url metadata encoded key

### DESCRIPTION_URL_METADATA_KEY

```solidity
bytes32 DESCRIPTION_URL_METADATA_KEY
```

default encoded key for description url metadata

### metadata

```solidity
mapping(bytes32 => bytes) metadata
```

metadata key => metadata value

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints mTBILL token `amount` to a given `to` address.
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

burns mTBILL token `amount` to a given `to` address.
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

puts mTBILL token on pause.
should be called only from permissioned actor

### unpause

```solidity
function unpause() external
```

puts mTBILL token on pause.
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

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
```

### onlyNotBlacklistedTester

```solidity
function onlyNotBlacklistedTester(address account) external
```

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## DataFeedTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## DecimalsCorrectionTester

### convertAmountFromBase18Public

```solidity
function convertAmountFromBase18Public(uint256 amount, uint256 decimals) public pure returns (uint256)
```

### convertAmountToBase18Public

```solidity
function convertAmountToBase18Public(uint256 amount, uint256 decimals) public pure returns (uint256)
```

## DepositVaultTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## GreenlistableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
```

### onlyGreenlistedTester

```solidity
function onlyGreenlistedTester(address account) external
```

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## ManageableVaultTester

### initialize

```solidity
function initialize(address _accessControl, address _stUsd) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl, address _stUsd) external
```

### vaultRole

```solidity
function vaultRole() public view virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### getFee

```solidity
function getFee(address) external view returns (uint256)
```

## MidasAccessControlTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## PausableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
```

### pauseAdminRole

```solidity
function pauseAdminRole() public view returns (bytes32)
```

_virtual function to determine pauseAdmin role_

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## RedemptionVaultTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## WithMidasAccessControlTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
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

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## mTBILLTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

