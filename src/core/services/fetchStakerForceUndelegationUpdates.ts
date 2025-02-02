import { eigenlayer_delegation_subgraph_url } from '../environment/theGraph'
import { log } from '../modules/logger'
import { GraphStakerForceUndelegationBody } from '../types'

export async function fetchStakerForceUndelegationUpdates(latestBlockNumber: number) {
  if (!eigenlayer_delegation_subgraph_url) throw new Error('eigenlayer_delegation_subgraph_url is undefined')

  const QUERY = `
      query FetchStakerForceUndelegationUpdates($blockNumber: Int!, $first: Int!, $skip: Int!) {
        stakerForceUndelegateds(
          where: { blockNumber_gt: $blockNumber }
          first: $first
          skip: $skip
          orderBy: blockNumber
          orderDirection: asc
        ) {
          id
          staker
          operator
          blockNumber
          blockTimestamp
          transactionHash
          __typename
        }
      }
    `

  let hasMore = true
  let skip = 0
  const first = 100
  const results = []

  while (hasMore) {
    if (skip === 5000) {
      log.pinoInfo('Reached 5k skip limit', {
        endpoint: '/stakerForceUndelegationsUpdate',
        additionalData: {
          action: fetchStakerForceUndelegationUpdates.name,
        },
      })

      return { results, hasMore }
    }

    const response = await fetch(eigenlayer_delegation_subgraph_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          blockNumber: latestBlockNumber,
          first,
          skip,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const { data, errors } = (await response.json()) as GraphStakerForceUndelegationBody

    if (errors) {
      throw new Error(`GraphQL error: ${errors.map((error: any) => error.message).join(', ')}`)
    }

    const { stakerForceUndelegateds } = data

    if (!stakerForceUndelegateds || stakerForceUndelegateds.length < first) {
      hasMore = false
    } else {
      skip += first
    }

    if (stakerForceUndelegateds && stakerForceUndelegateds.length > 0) {
      results.push(...stakerForceUndelegateds)
    }
  }

  return { results, hasMore }
}
