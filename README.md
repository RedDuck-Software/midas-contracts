# Midas smart contracts repository

This repository contains all smart contracts related to the [midas.app](https://midas.app) project

## The structure of the repository

- [.openzeppelin/](./.openzeppelin/) - contains files related to openzeppelin proxy deployment (such as deployment addresses, storage layout, etc. )
- [config/](./config/) - contains application static configuration (like network configs, TS types etc.)
- [contracts/](./contracts/) - root folder for smart contracts source code
- [deployments/](./deployments/) - *deprecated*. hardhat-deploy deployment folder
- [docgen/](./docgen/) - contains auto generated smart-contracts documentation
- [helpers/](./helpers/) - shared helpers utilities
- [scripts/](./scripts/) - hardhat scripts. Currently contains deploy/upgrade scripts for smart contracts
- [tasks/](./tasks/) - hardhat tasks. Currently contains calldata generator scripts
- [test/](./test/) - smart contracts tests

## How to run?

First, install the dependencies using `yarn`

```
yarn install
```

To build smart contracts, execute

```
yarn build
```

To run tests, execute

```
yarn test
```

To run test`s coverage, execute

```
yarn coverage
```

To use Slither analyzer, first install it. [Link](https://github.com/crytic/slither)

To run the analyzer, execute

```
yarn slither
```


To generate smart contract`s documentation, execute

```
yarn docgen
```

## Smart contracts API documentation

All smart contracts are documented using NatSpec format. To review the latest generated documentation, please check the [docgen/index.md](./docgen/index.md) file


## High level contracts overview

### **stUSD**
The main smart contract in the project is [stUSD](./contracts/stUSD.sol) token. It can be minted or burned by permissioned actor. Permissioned actor - is an address that has spesific role in the [MidasAccessControl](./contracts/access/MidasAccessControl.sol) contract. Usually, mint/burn operations are made through Vaults smart contracts, but because of flexible role-based authorization, they can be made manually by the address with sufficient rights - such as project owner or administrator

Also, stUSD has a blacklist functionality, that disallows banned users to use token`s transfers functions (transfer and transferFrom)

stUSD is pauseable, that means that some permissioned actor (such as project owner or administrator) can put the token on pause, which will make it temporary unusable for users


### **DataFeed**

DataFeed its a contract, the main purpose of which is to wrap ChainLinks AggregatorV3 data feed and to convert answer to base18 number. Currently, there are 2 aggregators that were used and wrapped using DataFeed
- [EUR/USD](https://data.chain.link/ethereum/mainnet/fiat/eur-usd) - used to denominate the minimal deposit amount in EUR
- [IBO1/USD](https://data.chain.link/ethereum/mainnet/indexes/ib01-usd) - used to calculate the USD/stUSD exchange price
### **Vaults**

Its a set of smart contracts, that are supposed to make stUSD minting and burning more transparent for the end-user. Vaults also operates with tokens that we called USD tokens. USD token - it`s a stable coin that is supported by the vault and threated as a token that is 1:1 equivalent to USD. All vaults do have it own lists of supported USD tokens.

Vaults can be used only by addresses, that have GreenListed Role on the [MidasAccessControl](./contracts/access/MidasAccessControl.sol) contract

There is 2 types of vaults presented in the project - Deposit and Redemption vaults

#### ***Deposit Vault***
Deposit is the process of minting stUSD tokens by transferring USD tokens from user. The exchange ratio can be calculated using the DataFeed answer, but currently it's all determined by the vault administrator individually for each deposit. USD tokens are stored in contract and can be withdrawn by vault admin at any time.
The process consists of 2 steps:
1. Deposit request initiation
2. Deposit request fulfillment

The initiation is done by the user, that want to transfer his USD tokens and receive stUSD token instead. After the initiation transaction, his USD tokens are immediately transfer from him, and now he needs to wait for deposit request fulfillment from the vault administrator.

The fulfillment is done by the vault administrator. Administrator should deposit the funds to the bank deposit, calculate the output stUSD amount and submit fulfillment transaction to the network.

Administrator may also decide to cancel the redemption request. In this case, transferred USD tokens will be transferred back to the user and request will be deleted from the contract's storage.

The whole deposit process can be made by vault administrator for any user, that owns USD tokens. This action is basically a wrapper of the USD transfer function, made for easier off-chain events listening

Deposit Vault can have a fee on stUSD minting. Because the output USD amount currently determined off-chain by the vault administrator, the value that stores in the contract currently is not used for the resulting USD output amount.


#### ***Redemption Vault***

Redemption is the process of returning USD tokens by burning stUSD. The exchange ratio can be calculated using the DataFeed answer, but currently its all determined by the vault administrator individually for each redemption. The process is consist of 2 steps: 

1. Redemption request initiation
2. Redemption request fulfillment

The initiation is done by the user, that want to burn his stUSD tokens and receive USD token instead. After the initiation transaction, his stUSD tokens are immediately burns and now he need to wait for redemption request fulfillment from the vault administrator. 

The fulfillment is done by the vault administrator. Administrator should withdraw the funds from the bank deposit, convert them into the USD token (that was selected by user during the initiation step), send tokens to the RedemptionVault contract, calculate the output USD amount and submit fulfillment transaction to the network

Administrator may also decide to cancel the redemption request. In this case, burned stUSD tokens will be minted back to the user and request will be deleted from the contracts storage.

The whole redemption process can be made by vault administrator for any user, that owns stUSD tokens. This action is basically a wrapper of the stUSD's burn function, made for easier off-chain events listening

Redemption Vault can have a fee on stUSD burning. Because the output USD amount currently determined off-chain by the vault administrator, the value that stores in the contract currently is not used for the resulting USD output amount.


## Smart contract addresses

|Contract Name|Sepolia|Mainnet| 
|-|-|-|
|**stUSD**|`0xDd82C21F721746Bd77D84E8B05EdDED0f8e50980`|-|
|**MidasAccessControl**|`0x44af5F38a9b4bf70696fa1bE922e70c2Af679FD7`|-|
|**DataFeed IB01/USD**|`0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E`|-|
|**DataFeed EUR/USD**|`0xE23c07Ecad6D822500CbE8306d72A90578CA9F11`|-|
|**DepositVault**|`0xc2c78dcb340935509634B343840fAa5052367f29`|-|
|**RedemptionVault**|`0xbCe90740A9C6B59FC1D45fdc0e1F3b6C795c85dC`|-|