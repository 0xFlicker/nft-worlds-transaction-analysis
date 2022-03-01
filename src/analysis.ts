import { BigNumber, utils } from 'ethers'
import fs from 'fs'
import cliProgress from 'cli-progress'

const bar = new cliProgress.MultiBar({
  format: '{job} {bar} {percentage}% | {value}/{total}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  autopadding: true,
  hideCursor: true,
  clearOnComplete: true
})

type DecodedTransaction = ({
  hash: string,
  blockNumber: number,
  gasPrice: string,
  from: string,
  value: string,
  sigHash?: string,
  method?: string,
  args?: any,
  logs?: utils.LogDescription[]
  status: string,
})

type MintData  = {
  whitelisted: boolean,
  count: number,
  transactions: string[],
  tokens: number[],
}

async function doIt() {
  const nftTransactions: DecodedTransaction[] = JSON.parse(await fs.promises.readFile('./nft_worlds_transactions_decoded.json', 'utf8'))
  nftTransactions.sort((a, b) => a.blockNumber - b.blockNumber)
  const whiteListed: Record<string, boolean> = {}
  const minters: Record<string, MintData> = {}
  for (const transaction of nftTransactions) {
    if (transaction.status === 'success') {
      if (transaction?.method === 'joinWhitelist(bytes)') {
        whiteListed[transaction.from] = true
      }
    }
  }
  const whiteListedNoMint = {
    ...whiteListed
  }
  for (const transaction of nftTransactions) {
    if (transaction.status === 'success') {
      if (transaction?.method === 'mintWorld((uint256,int32,(uint24[5],uint16[9],uint8[3],uint8[],uint8[]),string),bytes)' && transaction.logs) {
        
        delete whiteListedNoMint[transaction.from]
        const transactions = minters[transaction.from]?.transactions || []
        const tokens = minters[transaction.from]?.tokens || []
        transactions.push(transaction.hash)
        tokens.push(BigNumber.from(transaction.logs[0].args[2]).toNumber())
        minters[transaction.from] = {
          whitelisted: !!whiteListed[transaction.from],
          count: minters[transaction.from]?.count + 1 || 1,
          transactions,
          tokens
        }
      }
    }
  }

  const whitelistedTokenIds = Object.values(minters).filter(m => m.whitelisted).map(m => m.tokens).flat().sort((a, b) => a - b)
  const notWhitelistedTokenIds = Object.values(minters).filter(m => m.whitelisted).map(m => m.tokens).flat().sort((a, b) => a - b)

  await fs.promises.writeFile('./nft_worlds_minters.json', JSON.stringify({
    whitelistedTokenIds,
    notWhitelistedTokenIds,
    whitelistedNoMint: Object.keys(whiteListedNoMint),
    minters: Object.entries(minters).map(([address, data]) => ({
      from: address,
      ...data
    }))
  }, null, 2))
  console.log(`${Object.keys(whiteListed).length} whitelisted`)
  console.log(`${Object.keys(whiteListedNoMint).length} whitelisted no mint`)
  
}



doIt().then(() => console.log('done'), (e) => {
  console.error(e)
  process.exit(1)
})
