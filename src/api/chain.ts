export const CHAIN_URL = 'https://vit-chain.onrender.com'

export interface ChainHealth {
  status: string
  network: string
  chain_id: number
  version: string
  db_connected: boolean
  block_height: number
  active_validators: number
}

export interface Block {
  height: number
  block_hash: string
  prev_hash: string
  merkle_root: string
  timestamp: number
  validator_id: string
  tx_count: number
  total_fees: string
  block_reward: string
  storage_proofs: unknown[]
  consensus_votes: unknown[]
  transactions: unknown[]
}

export interface BlocksResponse {
  total: number
  limit: number
  offset: number
  blocks: Block[]
}

export interface Validator {
  node_id: string
  address: string
  name: string
  stake: string
  status: string
  reputation?: {
    blocks_produced: number
    blocks_missed: number
    miss_streak: number
    score: string
  }
  slashes?: unknown[]
}

export interface ValidatorsResponse {
  count: number
  validators: Validator[]
}

export interface Account {
  address: string
  balance: string
  staked: string
  nonce: number
}

export interface TxsResponse {
  total: number
  limit: number
  offset: number
  transactions: Transaction[]
}

export interface Transaction {
  tx_hash: string
  block_height: number | null
  from_address: string | null
  to_address: string
  amount: string
  tx_type: string
  timestamp: number
  status: string
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${CHAIN_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  health: () => get<ChainHealth>('/health'),
  blocks: (limit = 20, offset = 0) => get<BlocksResponse>(`/api/blocks?limit=${limit}&offset=${offset}`),
  block: (height: number) => get<{ block: Block; transactions: Transaction[] }>(`/api/blocks/${height}`),
  validators: () => get<ValidatorsResponse>('/api/validators'),
  validator: (address: string) => get<Validator>(`/api/validators/${address}`),
  account: (address: string) => get<Account>(`/api/accounts/${address}`),
  txs: (limit = 20, offset = 0) => get<TxsResponse>(`/api/txs?limit=${limit}&offset=${offset}`),
  tx: (hash: string) => get<Transaction>(`/api/txs/${hash}`),
}
