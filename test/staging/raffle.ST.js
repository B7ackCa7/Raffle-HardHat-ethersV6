const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", async function () {
          let raffle, raffleEntrancefee, signer

          beforeEach(async () => {
              const { deployer } = await getNamedAccounts()
              signer = await ethers.getSigner(deployer)

              const _raffle = await deployments.get("Raffle")
              console.log(`Raffle Contract Deployed To : ${_raffle.address}`)
              raffle = await ethers.getContractAt(
                  "Raffle",
                  _raffle.address,
                  signer
              )
              raffleEntrancefee = await raffle.getEntranceFee()
              console.log(`Entrance Fees : ${raffleEntrancefee}`)
          })

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink Keepers and Chainlink VRF & gives randomWinner", async () => {
                  console.log("Setting up test...")
                  // enter the raffle
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  console.log(`startingTimeStamp : ${startingTimeStamp}`)
                  const accounts = await ethers.getSigners()
                  console.log(`Accounts : ${accounts}`)

                  console.log("Setting up Listener...")
                  //settup the listener before entering the raffle
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event emit : Success")

                          try {
                              // asserts
                              const recentWinner =
                                  await raffle.getRecentWinner()
                              console.log(`recentWinner : ${recentWinner}`)
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp()
                              const winnerEndingBalance =
                                  await ethers.provider.getBalance(
                                      accounts[0].address
                                  )
                              const raffleBalance =
                                  await ethers.provider.getBalance(
                                      raffle.target
                                  )

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(
                                  recentWinner.toString(),
                                  accounts[0].address
                              )
                              assert.equal(raffleBalance, 0)
                              assert.equal(raffleState, 0)
                              //   assert.equal(
                              //       winnerEndingBalance,
                              //       winnerStartingBalance + raffleEntrancefee
                              //   )
                              assert(endingTimeStamp > startingTimeStamp)

                              console.log(
                                  `Winner Balance : ${winnerEndingBalance}`
                              )
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })

                      //raffle
                      console.log("Entering Raffle...")
                      const raffleEntryTxR = await raffle.enterRaffle({
                          value: raffleEntrancefee
                      })
                      console.log("Waiting one block")
                      await raffleEntryTxR.wait(1)
                      const winnerStartingBalance =
                          await ethers.provider.getBalance(signer.address)
                      console.log(
                          `winnerStartingBalance : ${winnerStartingBalance}`
                      )
                  })
              })
          })
      })
