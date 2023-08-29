const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

//15:19:29 / video timestamp

const BASE_FEE = "250000000000000000" // premium: 0.25 LINK per request
const GAS_PRICE_LINK = 1e9 //1000000000 LINK per gas :: calculated value based on the gas price of the chain

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("Local network detected!  Deploying mocks...")
        // deploy a mock vrf coordinator
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("Mocks Deployed!")
        log("------------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
