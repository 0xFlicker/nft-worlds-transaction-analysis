import { providers, utils } from 'ethers'
import fs from 'fs'
import cliProgress from 'cli-progress'
import { NftWorlds__factory } from './typechain/index.js'

const bar = new cliProgress.MultiBar({
  format: '{job} {bar} {percentage}% | {value}/{total}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  autopadding: true,
  hideCursor: true,
  clearOnComplete: true
})


async function doIt() {
  const provider = new providers.WebSocketProvider('ws://192.168.1.20:8546');
  const nftTransactions = JSON.parse(await fs.promises.readFile('./nft_worlds_transactions.json', 'utf8'))
  const nftWorldsContract = NftWorlds__factory.createInterface();
  const decodedTransactions: ({
    hash: string,
    gasPrice: string,
    blockNumber: number,
    from: string,
    value: string,
    sigHash: string,
    method: string,
    args: any,
    logs: utils.LogDescription[]
    status: string,
  } | {
    hash: string,
    blockNumber: number,
    from: string,
    value: string,
    gasPrice: string,
    status: string,
   })[] = []
    
  const blocksProgress = bar.create(nftTransactions.length, 0, { job: "Blocks".padEnd(20) })
  for (const transaction of nftTransactions) { 
    blocksProgress.increment()
    const receipt = await provider.getTransactionReceipt(transaction.hash)
    try {
      const decodedTransaction = nftWorldsContract.parseTransaction(transaction)
      const logs = receipt.logs.map(l => nftWorldsContract.parseLog(l))
      decodedTransactions.push({
        hash: transaction.hash,
        blockNumber: receipt.blockNumber,
        gasPrice: utils.formatUnits(receipt.effectiveGasPrice, 'gwei'),
        from: transaction.from,
        value: utils.formatUnits(transaction.value, 'ether'),
        sigHash: decodedTransaction.sighash,
        method: decodedTransaction.signature,
        status: receipt.status ? 'success' : 'failure',
        args: decodedTransaction.functionFragment.inputs.reduce((acc, input) => {
          acc[input.name] = decodedTransaction.args[input.name]
          return acc
        }, {} as Record<string, any>),
        logs
      })
    } catch (e) {
      decodedTransactions.push({
        hash: transaction.hash,
        blockNumber: receipt.blockNumber,
        from: transaction.from,
        value: utils.formatUnits(transaction.value, 'ether'),
        gasPrice: utils.formatUnits(receipt.effectiveGasPrice, 'gwei'),
        status: receipt.status ? 'success' : 'failure',
      })
    }

  }
  await fs.promises.writeFile('./nft_worlds_transactions_decoded.json', JSON.stringify(decodedTransactions, null, 2))
}



doIt().then(() => console.log('done'), (e) => {
  console.error(e)
  process.exit(1)
})
