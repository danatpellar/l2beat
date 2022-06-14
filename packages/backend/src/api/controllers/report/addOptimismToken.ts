import { CoingeckoId, UnixTime } from '@l2beat/common'

import { calculateTVL as calculateTVL } from '../../../core/ReportUpdater'
import {
  PriceRecord,
  PriceRepository,
} from '../../../peripherals/database/PriceRepository'
import { OutputEntry, saveTVLToEntry } from './aggregateReportsDaily'

// This is the circulating supply of OP as given by Coingecko.
// The value is obtained by looking at how many tokens have been designated
// to be distributed in the Optimism's airdrop.
// Our policy is to keep this value in sync with Coingecko.
// https://www.coingecko.com/en/coins/optimism
// https://optimistic.etherscan.io/token/0x4200000000000000000000000000000000000042?a=0x2a82ae142b2e62cb7d10b55e323acb1cab663a26
const OP_TOKEN_BALANCE = 214_748_364n * 10n ** 18n

export async function addOptimismToken(
  entries: OutputEntry[],
  priceRepository: PriceRepository,
) {
  const opPrices = await priceRepository.getByToken(CoingeckoId('optimism'))
  const ethPrices = await priceRepository.getByToken(CoingeckoId('ethereum'))
  for (const entry of entries) {
    const date = entry.timestamp
    if (date.lt(UnixTime.fromDate(new Date('2022-05-30')))) {
      return
    }

    const opPrice = opPrices.find(findByTimestamp(entry.timestamp))?.priceUsd
    const ethPrice = ethPrices.find(findByTimestamp(entry.timestamp))?.priceUsd
    if (opPrice === undefined || ethPrice === undefined) {
      return
    }

    const { usdTVL, ethTVL } = calculateTVL(
      opPrice,
      18,
      OP_TOKEN_BALANCE,
      ethPrice,
    )

    saveTVLToEntry(
      entry,
      'Optimism',
      usdTVL,
      ethTVL,
      OP_TOKEN_BALANCE,
      'OP',
      18,
    )
  }
}

const findByTimestamp = (timestamp: UnixTime) => (price: PriceRecord) =>
  price.timestamp.equals(timestamp)