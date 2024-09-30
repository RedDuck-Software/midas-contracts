
import { Contract } from 'ethers';
import hre from 'hardhat';

const abiFactory = [{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"caller","type":"address"},{"indexed":false,"internalType":"address","name":"oracle","type":"address"}],"name":"CreateMorphoChainlinkOracleV2","type":"event"},{"inputs":[{"internalType":"contract IERC4626","name":"baseVault","type":"address"},{"internalType":"uint256","name":"baseVaultConversionSample","type":"uint256"},{"internalType":"contract AggregatorV3Interface","name":"baseFeed1","type":"address"},{"internalType":"contract AggregatorV3Interface","name":"baseFeed2","type":"address"},{"internalType":"uint256","name":"baseTokenDecimals","type":"uint256"},{"internalType":"contract IERC4626","name":"quoteVault","type":"address"},{"internalType":"uint256","name":"quoteVaultConversionSample","type":"uint256"},{"internalType":"contract AggregatorV3Interface","name":"quoteFeed1","type":"address"},{"internalType":"contract AggregatorV3Interface","name":"quoteFeed2","type":"address"},{"internalType":"uint256","name":"quoteTokenDecimals","type":"uint256"},{"internalType":"bytes32","name":"salt","type":"bytes32"}],"name":"createMorphoChainlinkOracleV2","outputs":[{"internalType":"contract MorphoChainlinkOracleV2","name":"oracle","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isMorphoChainlinkOracleV2","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];
const abiOracle = [{"inputs":[],"name":"price","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

const main  = async () =>{
    const { deployer } = await hre.getNamedAccounts();
    const owner = await hre.ethers.getSigner(deployer);

    const factory = new Contract('0x3a7bb36ee3f3ee32a60e9f2b33c1e5f2e83ad766', abiFactory, owner);
    
    const addr = await factory.callStatic.createMorphoChainlinkOracleV2(
            "0x0000000000000000000000000000000000000000",
            "1",
            "0x056339c044055819e8db84e71f5f2e1f536b2e5b",
            "0x0000000000000000000000000000000000000000",
            "18",
            "0x0000000000000000000000000000000000000000",
            "1",
            "0x8fffffd4afb6115b954bd326cbe7b4ba576818f6",
            "0x0000000000000000000000000000000000000000",
            "6",
            "0xc44e0411adc60a41b539c9d5af52e11913491958c68a326bc48fd0c444bb2618"
    )
   await (await factory.createMorphoChainlinkOracleV2(
        "0x0000000000000000000000000000000000000000",
        "1",
        "0x056339c044055819e8db84e71f5f2e1f536b2e5b",
        "0x0000000000000000000000000000000000000000",
        "18",
        "0x0000000000000000000000000000000000000000",
        "1",
        "0x8fffffd4afb6115b954bd326cbe7b4ba576818f6",
        "0x0000000000000000000000000000000000000000",
        "6",
        "0xc44e0411adc60a41b539c9d5af52e11913491958c68a326bc48fd0c444bb2618"
)).wait()

const oracle= new Contract(addr, abiOracle, owner);

console.log((await oracle.price()).toString())
}


main();