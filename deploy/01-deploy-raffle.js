const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { EtherSymbol } = require("ethers")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = ethers.parseEther("30")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const signer = await ethers.getSigner(deployer)
    const chainId = network.config.chainId
    const abi = new ethers.AbiCoder()

    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2M = await deployments.get("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2M.address
        vrfCoordinatorV2Mock = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vrfCoordinatorV2Address,
            signer
        )
        //create subscription
        const transactionResponse =
            await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)

        _subscriptionId = transactionReceipt.logs[0].topics[1]
        const data = abi.decode(["uint256"], _subscriptionId)
        subscriptionId = data[0]
        // fund subcription
        const fundTxn = await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            FUND_AMOUNT
        )
        await fundTxn.wait(1)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const arguments = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })

    if (developmentChains.includes(network.name)) {
        const _vrfCoordinatorV2 = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vrfCoordinatorV2Address,
            signer
        )
        const consumerAddTxn = await _vrfCoordinatorV2.addConsumer(
            subscriptionId,
            raffle.address
        )
        await consumerAddTxn.wait(1)
    }

    // Verify the deployment
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...")
        await verify(raffle.address, arguments)
    }
    log("------------------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
