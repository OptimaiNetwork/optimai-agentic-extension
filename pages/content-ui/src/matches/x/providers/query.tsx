import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@x/queries/client'
import { PropsWithChildren } from 'react'

const QueryProvider = ({ children }: PropsWithChildren) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default QueryProvider
