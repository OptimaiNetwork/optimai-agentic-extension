import { useQuery } from '@tanstack/react-query'
import { catalystService, type VenueSelection } from '@x/services/catalyst'

/**
 * What the connected wallet holds of the token it is about to spend: the
 * settlement token on a buy, the stock token on a sell.
 *
 * A query, not a mutation, unlike the quote beside it: a balance is a fact
 * about the wallet rather than an offer that starts expiring, so it caches and
 * re-reads on its own schedule. Thirty seconds is roughly a block on either
 * chain plus the time it takes a person to read a number.
 *
 * Disabled until there is a wallet: an unconnected panel has nothing to ask
 * about, and asking anyway would put an empty address in a server log.
 */
export const useWalletBalance = (
  wallet: string | undefined,
  payToken: string,
  selection: VenueSelection
) =>
  useQuery({
    queryKey: ['wallet-balance', selection.venue, selection.chain, wallet, payToken],
    queryFn: async () => (await catalystService.tradeBalance(wallet!, payToken, selection)).data,
    // And until there is a token to ask about: on the sell side that is the
    // stock token, which is not known until the cashtag has resolved.
    enabled: Boolean(wallet && payToken),
    staleTime: 30_000,
    refetchInterval: 30_000,
    // A wallet that cannot be read is not an error worth a red box on a buy
    // screen — the amount field still works, and the quote will fail honestly
    // if the funds are not there.
    retry: 1,
  })
