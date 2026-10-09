import {
  catalystService,
  type TradeSide,
  type TradeVenue,
  type VenueSelection,
} from '@x/services/catalyst'
import { useMutation } from '@tanstack/react-query'

/**
 * A mutation, not a query: each call mints a quote id that starts expiring the
 * moment it exists, so it runs when somebody asks for a price and never on
 * render.
 */
export const useTradeQuote = () =>
  useMutation({
    mutationFn: async (input: {
      ticker: string
      venue: TradeVenue
      side: TradeSide
      payToken: string
      payAmount: string
      wallet: string
      selection?: VenueSelection
    }) => {
      const { data } = await catalystService.tradeQuote(
        {
          ticker: input.ticker,
          venue: input.venue,
          side: input.side,
          pay_token: input.payToken,
          pay_amount: input.payAmount,
          wallet: input.wallet,
        },
        input.selection
      )
      return data
    },
  })
