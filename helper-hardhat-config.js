const { ethers } = require("hardhat")

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103b0a8a00be2ddc778e6e7eaa21791cd364625", //https://docs.chain.link/vrf/v2/subscription/supported-networks
        entranceFee: "10000000000000000",
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "4969",
        callbackGasLimit: "500000",
        interval: 30
    },
    31337: {
        name: "hardhat",
        entranceFee: "10000000000000000",
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "500000",
        interval: 30
    }
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains
}
