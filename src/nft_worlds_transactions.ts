import { Transaction, providers, utils } from 'ethers'
import { NftWorlds__factory, NftWorlds } from './typechain/index.js'
import cliProgress from 'cli-progress'
import fs from 'fs'

async function doit() {
  console.log("before provider")
  const provider = new providers.WebSocketProvider('ws://192.168.1.20:8546')
  console.log("after provider")
  const currentBlock = await provider.getBlockNumber()
  const createOnBlock = 13352299
  const aproxiamteTransactions = 38219;
  const bar = new cliProgress.MultiBar({
    format: '{job} {bar} {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    autopadding: true,
    hideCursor: true,
    clearOnComplete: true
  })
  
  const blocksProgress = bar.create(currentBlock - createOnBlock, 0, { job: "Blocks".padEnd(20) })
  const transactionsProgress = bar.create(aproxiamteTransactions, 0, { job: "Transactions".padEnd(20) })
  const nftWorldTransactions: Transaction[] = []
  const nftWorldsContract = NftWorlds__factory.connect('0xbd4455da5929d5639ee098abfaa3241e9ae111af', provider)
  const contractAddress =  utils.getAddress(nftWorldsContract.address)
  for (let block = createOnBlock; block <= currentBlock; block++) {
    blocksProgress.increment()
    const blockData = await provider.getBlock(block)
    const transactions = await Promise.all(blockData.transactions.map(t => provider.getTransaction(t)))
    for (let tx of transactions) {
      if (tx.to && tx.to === contractAddress) {
        transactionsProgress.increment()
        nftWorldTransactions.push(tx)
      }
    }
    if (block % 1000 === 0) {
      await fs.promises.writeFile('./nft_worlds_transactions.json', JSON.stringify(nftWorldTransactions, null, 2))
    }
  }
  bar.stop()
  await fs.promises.writeFile('./nft_worlds_transactions.json', JSON.stringify(nftWorldTransactions, null, 2))
}

doit().then(() => console.log('done'), (e) => console.error(e))


// const seedMappingOffset = 28; // Discovered via iteration
// // const getStorageIndex = index => ethers.utils.keccak256(ethers.utils.concat([ethers.utils.zeroPad(index, 32), ethers.utils.zeroPad(seedMappingOffset, 32)]))
// const nftWorldSeeds = {}
// for (let index = 1; index <= seedMappingOffset; index++) {
//   console.log(index)
//   console.log(await provider.getStorageAt(nftWorldsContract, index))
// }
// await fs.promises.writeFile('nftWorlds.json', JSON.stringify(nftWorldSeeds, null, 2), 'utf8')