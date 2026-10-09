/** BNB Smart Chain, as a wallet expects to be told about it. */
export const BSC_CHAIN_ID = '0x38'

/**
 * Sent only when the wallet does not already know this chain.
 *
 * `wallet_switchEthereumChain` answers 4902 for a chain it has never heard of,
 * and a wallet installed for Ethereum has not heard of this one. The reference
 * implementation this was built from only ever toggles mainnet and Sepolia, so
 * it never needed this and it is written here from scratch.
 */
export const BSC_CHAIN_PARAMS = {
  chainId: BSC_CHAIN_ID,
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.bnbchain.org'],
  blockExplorerUrls: ['https://bscscan.com'],
} as const

/** MetaMask's own code for "the user has not heard of this chain either". */
export const UNRECOGNISED_CHAIN = 4902

/** EIP-1193: the user closed the prompt. Not an error worth a stack trace. */
export const USER_REJECTED = 4001
