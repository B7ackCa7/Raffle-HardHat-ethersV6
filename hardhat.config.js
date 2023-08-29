require("@nomicfoundation/hardhat-toolbox")
require("@nomicfoundation/hardhat-verify")
require("hardhat-deploy")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()
require("solidity-coverage")

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
const PRIVATE_KEY = process.env.PRIVATE_KEY
const GAS_REPORT = process.env.GAS_REPORT
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1
            // gasPrice: 130000000000,
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            blockConfirmations: 6
        }
    },
    solidity: {
        compilers: [
            {
                version: "0.8.19"
            },
            {
                version: "0.8.7"
            }
        ]
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true
        //coinmarketcap: GAS_REPORT
    },
    namedAccounts: {
        deployer: {
            default: 0
        },
        player: {
            default: 1
        }
    },
    mocha: {
        timeout: 200000
    }
}
