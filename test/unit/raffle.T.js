const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig
} = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", async function () {
          let raffle,
              vrfCoordinatorV2Mock,
              raffleEntrancefee,
              interval,
              signer,
              abi
          const chainId = network.config.chainId

          beforeEach(async () => {
              const { deployer } = await getNamedAccounts()
              signer = await ethers.getSigner(deployer)

              contracts = await deployments.fixture(["all"])
              raffle = await ethers.getContractAt(
                  "Raffle",
                  contracts["Raffle"].address,
                  signer
              )
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  "VRFCoordinatorV2Mock",
                  contracts["VRFCoordinatorV2Mock"].address,
                  signer
              )
              raffleEntrancefee = await raffle.getEntranceFee()
              //raffleEntrancefee = networkConfig[chainId].entranceFee
              //interval = await raffle.getInterval()
              interval = networkConfig[chainId].interval
              abi = new ethers.AbiCoder()
          })

          describe("constructor", async () => {
              it("Intializes the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId]["interval"]
                  )
                  //   console.log(interval)
                  //   _interval = Number(interval)
                  //   console.log("--------------------------")
                  //   console.log(_interval)
              })
          })

          describe("enter raffle", async () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(
                      raffle.enterRaffle()
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughETHEntered"
                  )
              })
              it("records players when they enter", async () => {
                  //raffle entranceFee

                  const entry = await raffle.enterRaffle({
                      value: raffleEntrancefee
                  })
                  await entry.wait(1)
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, signer.address)
              })
              it("emits event on enter", async () => {
                  await expect(
                      raffle.enterRaffle({ value: raffleEntrancefee })
                  ).to.emit(raffle, "RaffleEntered")
              })
              it("doesn't allow entrance when raffle is calculating", async () => {
                  const enterRaf = await raffle.enterRaffle({
                      value: raffleEntrancefee
                  })
                  await enterRaf.wait(1)
                  //https://hardhat.org/hardhat-network/docs/reference#json-rpc-methods-support
                  await ethers.provider.send("evm_increaseTime", [interval])
                  //increased time and then mined a block to move foward
                  await ethers.provider.send("evm_mine")
                  const perUpkeepTxn = await raffle.performUpkeep("0x")
                  await perUpkeepTxn.wait(1)

                  await expect(
                      raffle.enterRaffle({ value: raffleEntrancefee })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })
          describe("checkUpkeep", async () => {
              it("returns if people haven't sent any ETH", async () => {
                  await ethers.provider.send("evm_increaseTime", [interval])
                  await ethers.provider.send("evm_mine")

                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall("0x")
                  console.log(upkeepNeeded)
                  //const { upkeepNeeded } = await raffle.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntrancefee })
                  await ethers.provider.send("evm_increaseTime", [interval])
                  await ethers.provider.send("evm_mine")
                  const perUpkeepTxn = await raffle.performUpkeep("0x")
                  await perUpkeepTxn.wait(1)
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall("0x")
                  assert.equal(raffleState.toString(), "1") //calculating
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntrancefee })

                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall("0x")
                  assert(upkeepNeeded == false)
              })
              it("returns true if enough time has passed, has players, ETH and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntrancefee })
                  await ethers.provider.send("evm_increaseTime", [interval])
                  await ethers.provider.send("evm_mine")
                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall("0x")
                  console.log(upkeepNeeded)
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", () => {
              it("it can only run if checkUpKeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntrancefee })
                  await ethers.provider.send("evm_increaseTime", [interval])
                  await ethers.provider.send("evm_mine")
                  const perUpkeepTxn = await raffle.performUpkeep("0x")
                  assert(perUpkeepTxn)
              })
              it("reverts when checkUpKeep is false", async () => {
                  await expect(
                      raffle.performUpkeep("0x")
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded"
                  )
              })
              it("updates the raffle state, emits an event and calls the vrf coordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEntrancefee })
                  await ethers.provider.send("evm_increaseTime", [interval])
                  await ethers.provider.send("evm_mine")
                  const txResponse = await raffle.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)
                  const requestId = abi.decode(
                      ["uint256"],
                      txReceipt.logs[1].topics[1]
                  )
                  const CALCULATING = 1
                  const raffleState = await raffle.getRaffleState()
                  assert(requestId > 0)
                  assert(raffleState, CALCULATING)
              })
              describe("fulfillRandomWords", () => {
                  beforeEach(async () => {
                      await raffle.enterRaffle({ value: raffleEntrancefee })
                      await ethers.provider.send("evm_increaseTime", [interval])
                      await ethers.provider.send("evm_mine")
                  })
                  it("can only be called after performUpkeep", async () => {
                      await expect(
                          vrfCoordinatorV2Mock.fulfillRandomWords(
                              0,
                              raffle.target
                          )
                      ).to.be.revertedWith("nonexistent request")
                      await expect(
                          vrfCoordinatorV2Mock.fulfillRandomWords(
                              1,
                              raffle.target
                          )
                      ).to.be.revertedWith("nonexistent request")
                  })
                  it("picks a winner, resets the lottery and sends money", async () => {
                      //const entrants = 3
                      //const startingAccountIndex = 1
                      const accounts = await ethers.getSigners()
                      for (let i = 1; i < 4; i++) {
                          const raffleEntrant = raffle.connect(accounts[i])
                          const entryResponse = await raffleEntrant.enterRaffle(
                              {
                                  value: raffleEntrancefee
                              }
                          )
                          await entryResponse.wait(1)
                      }
                      const startingTimeStamp =
                          await raffle.getLatestTimeStamp()
                      const initRaffleBalance =
                          await ethers.provider.getBalance(raffle.target)
                      console.log(`initRaffleBalance${initRaffleBalance}`)

                      //performUpKeep ( mock being Chainlink Keepers )
                      // fulfillRandomWords ( mock being the Chainlink VRF)
                      await new Promise(async (resolve, reject) => {
                          raffle.once("WinnerPicked", async () => {
                              console.log("WinnerPicked emitted")
                              try {
                                  const recentWinner =
                                      await raffle.getRecentWinner()
                                  console.log(`recentWinner : ${recentWinner}`)
                                  console.log(
                                      `account 0 : ${accounts[0].address}`
                                  )
                                  console.log(
                                      `account 1 : ${accounts[1].address}`
                                  )
                                  console.log(
                                      `account 2 : ${accounts[2].address}`
                                  )
                                  console.log(
                                      `account 3 : ${accounts[3].address}`
                                  )

                                  const raffleState =
                                      await raffle.getRaffleState()
                                  const endingTimeStamp =
                                      await raffle.getLatestTimeStamp()
                                  const numPlayers =
                                      await raffle.getNumberOfPlayers()
                                  const raffleBalance =
                                      await ethers.provider.getBalance(
                                          raffle.target
                                      )
                                  const winnerEndingBalance =
                                      await ethers.provider.getBalance(
                                          accounts[1].address
                                      )
                                  console.log(
                                      `winnerEndingBalance : ${winnerEndingBalance}`
                                  )

                                  //asserts
                                  assert.equal(numPlayers.toString(), "0")
                                  assert.equal(raffleState.toString(), "0")
                                  assert.equal(raffleBalance, 0)
                                  assert(endingTimeStamp > startingTimeStamp)

                                  assert.equal(
                                      winnerEndingBalance,
                                      winnerStartingBalance + initRaffleBalance
                                  )
                              } catch (error) {
                                  reject(error)
                              }
                              resolve()
                          })

                          //
                          const perUpkeepTxn = await raffle.performUpkeep("0x")
                          const perUpkeepTxnReceipt = await perUpkeepTxn.wait(1)
                          const requestId = abi.decode(
                              ["uint256"],
                              perUpkeepTxnReceipt.logs[1].topics[1]
                          )
                          const winnerStartingBalance =
                              await ethers.provider.getBalance(
                                  accounts[1].address
                              )
                          console.log(
                              `winnerStartingBalance : ${winnerStartingBalance}`
                          )
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestId[0],
                              raffle.target
                          )
                      })
                  })
              })
          })
      })
