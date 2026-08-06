import React, { useState, useEffect, useCallback, useRef } from 'react'
import { api, CHAIN_URL, type ChainHealth, type Block, type Validator, type Transaction } from './api/chain'

// ── Helpers ────────────────────────────────────────────────────────────────

function truncate(s: string, n = 12) {
  return s.length > n * 2 + 3 ? `${s.slice(0, n)}…${s.slice(-6)}` : s
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmtVIT(amount: string): string {
  const n = parseFloat(amount)
  if (isNaN(n)) return '0 VIT'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M VIT`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K VIT`
  return `${n.toFixed(2)} VIT`
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString()
}

// ── Hooks ─────────────────────────────────────────────────────────────────

function useInterval(cb: () => void, ms: number) {
  const ref = useRef(cb)
  useEffect(() => { ref.current = cb }, [cb])
  useEffect(() => {
    const id = setInterval(() => ref.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}

// ── Components ─────────────────────────────────────────────────────────────

function Spinner() {
  return <span className="spinner" />
}

function Badge({ status }: { status: string }) {
  const cls = status === 'active' ? 'badge badge-green'
    : status === 'jailed' ? 'badge badge-red'
    : 'badge badge-blue'
  return <span className={cls}>{status}</span>
}

function BlockRow({ b, onClick }: { b: Block; onClick: () => void }) {
  return (
    <tr>
      <td>
        <span className="hash mono" onClick={onClick}>#{b.height}</span>
      </td>
      <td>
        <span className="hash mono" onClick={onClick} title={b.block_hash}>
          {truncate(b.block_hash, 10)}
        </span>
      </td>
      <td className="mono" title={fmtDate(b.timestamp)}>{timeAgo(b.timestamp)}</td>
      <td>{b.tx_count}</td>
      <td>
        <span className="mono" style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
          {truncate(b.validator_id, 8)}
        </span>
      </td>
      <td style={{ color: 'var(--green)' }}>{fmtVIT(b.block_reward)}</td>
      <td>
        {b.storage_proofs.length > 0
          ? <span className="badge badge-green">{b.storage_proofs.length} proofs</span>
          : <span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>none</span>}
      </td>
    </tr>
  )
}

function ValidatorRow({ v }: { v: Validator }) {
  return (
    <tr>
      <td><span className="mono hash" title={v.address}>{truncate(v.address, 10)}</span></td>
      <td>{v.name || '—'}</td>
      <td style={{ color: 'var(--accent)' }}>{fmtVIT(v.stake)}</td>
      <td><Badge status={v.status} /></td>
      <td>{v.reputation?.blocks_produced ?? '—'}</td>
      <td style={{ color: v.reputation?.miss_streak ? 'var(--yellow)' : 'var(--text-muted)' }}>
        {v.reputation?.miss_streak ?? 0}
      </td>
      <td style={{ color: 'var(--text-sub)', fontSize: '.82rem' }}>
        {v.reputation?.score ? parseFloat(v.reputation.score).toFixed(3) : '—'}
      </td>
    </tr>
  )
}

// ── Views ──────────────────────────────────────────────────────────────────

function StatsBar({ health, loading }: { health: ChainHealth | null; loading: boolean }) {
  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-label">Block Height</div>
        <div className="stat-value accent">
          {loading && !health ? <Spinner /> : `#${(health?.block_height ?? 0).toLocaleString()}`}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Network</div>
        <div className="stat-value" style={{ fontSize: '1rem', paddingTop: '.2rem' }}>
          {health?.network ?? 'testnet'} <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>({health?.chain_id ?? 7764})</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Active Validators</div>
        <div className="stat-value green">{health?.active_validators ?? '—'}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Node Status</div>
        <div className="stat-value">
          {health
            ? <span className={`badge ${health.status === 'healthy' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '.9rem' }}>{health.status}</span>
            : '—'}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Epoch Time</div>
        <div className="stat-value" style={{ fontSize: '1rem' }}>15s</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Node Version</div>
        <div className="stat-value" style={{ fontSize: '1rem' }}>{health?.version ?? '—'}</div>
      </div>
    </div>
  )
}

function OverviewView({
  health,
  blocks,
  validators,
  loading,
  onBlockClick,
  onTab,
}: {
  health: ChainHealth | null
  blocks: Block[]
  validators: Validator[]
  loading: boolean
  onBlockClick: (b: Block) => void
  onTab: (t: string) => void
}) {
  return (
    <>
      <StatsBar health={health} loading={loading} />
      <div className="grid-2">
        <div className="section">
          <div className="section-header">
            <span className="section-title">Latest Blocks</span>
            <button className="nav-btn" onClick={() => onTab('blocks')}>View all →</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Height</th><th>Hash</th><th>Age</th><th>Txs</th><th>Reward</th>
                </tr>
              </thead>
              <tbody>
                {loading && blocks.length === 0
                  ? <tr><td colSpan={5} className="empty"><Spinner /></td></tr>
                  : blocks.slice(0, 10).map(b => (
                    <tr key={b.height}>
                      <td><span className="hash mono" onClick={() => onBlockClick(b)}>#{b.height}</span></td>
                      <td><span className="hash mono" onClick={() => onBlockClick(b)} title={b.block_hash}>{truncate(b.block_hash, 8)}</span></td>
                      <td className="mono">{timeAgo(b.timestamp)}</td>
                      <td>{b.tx_count}</td>
                      <td style={{ color: 'var(--green)' }}>{fmtVIT(b.block_reward)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="section">
          <div className="section-header">
            <span className="section-title">Validators</span>
            <button className="nav-btn" onClick={() => onTab('validators')}>View all →</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Address</th><th>Name</th><th>Stake</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading && validators.length === 0
                  ? <tr><td colSpan={4} className="empty"><Spinner /></td></tr>
                  : validators.map(v => (
                    <tr key={v.address}>
                      <td><span className="hash mono" title={v.address}>{truncate(v.address, 8)}</span></td>
                      <td>{v.name || '—'}</td>
                      <td style={{ color: 'var(--accent)' }}>{fmtVIT(v.stake)}</td>
                      <td><Badge status={v.status} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="section">
        <div className="section-header">
          <span className="section-title">MetaMask Setup</span>
          <span className="section-sub">Add VIT Chain to your wallet</span>
        </div>
        <div style={{ padding: '1rem 1.2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '.5rem' }}>
          {[
            ['Network Name', 'VIT Chain Testnet'],
            ['RPC URL', `${CHAIN_URL}/rpc`],
            ['Chain ID', '7764'],
            ['Currency Symbol', 'VIT'],
            ['Block Explorer', window.location.origin],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '.6rem .9rem' }}>
              <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: '.2rem' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.82rem', color: 'var(--text)', wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function BlocksView({ blocks, total, loading, onBlockClick }: {
  blocks: Block[]; total: number; loading: boolean; onBlockClick: (b: Block) => void
}) {
  const [page, setPage] = useState(0)
  const perPage = 20

  useEffect(() => { setPage(0) }, [])

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">All Blocks</span>
        <span className="section-sub">{total.toLocaleString()} total</span>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Height</th><th>Hash</th><th>Age</th><th>Txs</th>
              <th>Validator</th><th>Reward</th><th>Storage Proofs</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} className="empty"><Spinner /></td></tr>
              : blocks.length === 0
              ? <tr><td colSpan={7} className="empty">No blocks found</td></tr>
              : blocks.map(b => <BlockRow key={b.height} b={b} onClick={() => onBlockClick(b)} />)}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button className="btn btn-ghost" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>← Prev</button>
        <span className="page-info">Page {page + 1} · showing {blocks.length} of {total.toLocaleString()}</span>
        <button className="btn btn-ghost" disabled={blocks.length < perPage} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  )
}

function ValidatorsView({ validators, loading }: { validators: Validator[]; loading: boolean }) {
  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Validator Set</span>
        <span className="section-sub">{validators.length} active</span>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Address</th><th>Name</th><th>Stake</th><th>Status</th>
              <th>Blocks Produced</th><th>Miss Streak</th><th>Score</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} className="empty"><Spinner /></td></tr>
              : validators.length === 0
              ? <tr><td colSpan={7} className="empty">No active validators</td></tr>
              : validators.map(v => <ValidatorRow key={v.address} v={v} />)}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '.83rem', color: 'var(--text-muted)' }}>
          Want to become a validator? Run your own VIT Chain node with a unique{' '}
          <code style={{ color: 'var(--accent)', background: 'var(--accent-dim)', padding: '0 .3rem', borderRadius: '3px' }}>VIT_VALIDATOR_KEY</code>
          {' '}and register via <code style={{ color: 'var(--accent)', background: 'var(--accent-dim)', padding: '0 .3rem', borderRadius: '3px' }}>POST /api/validators/register</code>.
          {' '}See the <a href="https://github.com/vitnetwork/vit-chain" target="_blank" rel="noreferrer">vit-chain repo</a> for setup.
        </div>
      </div>
    </div>
  )
}

function SearchView() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true); setResult(null); setError('')
    try {
      if (/^\d+$/.test(q)) {
        const data = await api.block(parseInt(q))
        setResult({ type: 'block', data })
      } else if (/^0x[0-9a-fA-F]{40}$/i.test(q)) {
        const data = await api.account(q)
        setResult({ type: 'account', data })
      } else if (/^[0-9a-fA-F]{64}$/i.test(q) || q.startsWith('0x')) {
        const data = await api.tx(q)
        setResult({ type: 'tx', data })
      } else {
        setError('Enter a block height (number), address (0x…), or transaction hash.')
      }
    } catch {
      setError('Not found. Try a block height, wallet address (0x…), or transaction hash.')
    } finally {
      setLoading(false)
    }
  }

  const r = result as { type: string; data: Record<string, unknown> } | null

  return (
    <>
      <div className="search-wrap">
        <form className="search-form" onSubmit={search}>
          <input
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by block height, address (0x…), or tx hash"
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Search'}
          </button>
        </form>
        {error && <div style={{ marginTop: '.75rem', color: 'var(--red)', fontSize: '.88rem' }}>{error}</div>}
      </div>

      {r?.type === 'block' && (() => {
        const block = r.data as { block: Record<string, unknown>; transactions: unknown[] }
        const b = block.block
        return (
          <div className="detail-card">
            <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Block #{b.height as number}</div>
            {[
              ['Hash', b.block_hash],
              ['Previous Hash', b.prev_hash],
              ['Merkle Root', b.merkle_root],
              ['Timestamp', `${fmtDate(b.timestamp as number)} (${timeAgo(b.timestamp as number)})`],
              ['Validator', b.validator_id],
              ['Block Reward', fmtVIT(b.block_reward as string)],
              ['Transactions', b.tx_count],
              ['Storage Proofs', (b.storage_proofs as unknown[]).length || 'none'],
              ['Consensus Votes', (b.consensus_votes as unknown[]).length || 'none'],
            ].map(([label, val]) => (
              <div className="detail-row" key={label as string}>
                <div className="detail-label">{String(label)}</div>
                <div className="detail-val mono">{String(val)}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {r?.type === 'account' && (() => {
        const acc = r.data as { address: string; balance: string; staked: string; nonce: number }
        return (
          <div className="detail-card">
            <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Account</div>
            {[
              ['Address', acc.address],
              ['Balance', fmtVIT(acc.balance)],
              ['Staked', fmtVIT(acc.staked)],
              ['Nonce', acc.nonce],
            ].map(([label, val]) => (
              <div className="detail-row" key={label as string}>
                <div className="detail-label">{String(label)}</div>
                <div className="detail-val mono">{String(val)}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {r?.type === 'tx' && (() => {
        const tx = r.data as { tx_hash: string; from_address: string; to_address: string; amount: string; tx_type: string; status: string; timestamp: number }
        return (
          <div className="detail-card">
            <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Transaction</div>
            {[
              ['Hash', tx.tx_hash],
              ['From', tx.from_address ?? 'genesis'],
              ['To', tx.to_address],
              ['Amount', fmtVIT(tx.amount)],
              ['Type', tx.tx_type],
              ['Status', tx.status],
              ['Time', fmtDate(tx.timestamp)],
            ].map(([label, val]) => (
              <div className="detail-row" key={label as string}>
                <div className="detail-label">{String(label)}</div>
                <div className="detail-val mono">{String(val)}</div>
              </div>
            ))}
          </div>
        )
      })()}
    </>
  )
}

function BlockDetail({ block, onClose }: { block: Block; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: '640px', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600 }}>Block #{block.height}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
        <div style={{ padding: '0 1.2rem 1rem' }}>
          {[
            ['Hash', block.block_hash],
            ['Previous Hash', block.prev_hash],
            ['Merkle Root', block.merkle_root],
            ['Timestamp', fmtDate(block.timestamp)],
            ['Validator', block.validator_id],
            ['Block Reward', fmtVIT(block.block_reward)],
            ['Transactions', block.tx_count],
            ['Total Fees', fmtVIT(block.total_fees)],
            ['Storage Proofs', block.storage_proofs.length || 'none'],
            ['Consensus Votes', block.consensus_votes.length || 'none'],
          ].map(([label, val]) => (
            <div className="detail-row" key={label as string}>
              <div className="detail-label">{String(label)}</div>
              <div className="detail-val mono">{String(val)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'blocks' | 'validators' | 'search'

export default function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [health, setHealth] = useState<ChainHealth | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [total, setTotal] = useState(0)
  const [validators, setValidators] = useState<Validator[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [countdown, setCountdown] = useState(15)

  const REFRESH_MS = 15_000

  const load = useCallback(async () => {
    try {
      const [h, b, v] = await Promise.allSettled([
        api.health(),
        api.blocks(20, 0),
        api.validators(),
      ])
      if (h.status === 'fulfilled') setHealth(h.value)
      if (b.status === 'fulfilled') { setBlocks(b.value.blocks); setTotal(b.value.total) }
      if (v.status === 'fulfilled') setValidators(v.value.validators)
    } finally {
      setLoading(false)
      setLastRefresh(Date.now())
      setCountdown(15)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useInterval(load, REFRESH_MS)

  // countdown ticker
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) return 15
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [lastRefresh])

  const handleTab = (t: string) => setTab(t as Tab)

  return (
    <div className="layout">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <a className="logo" href="#" onClick={() => setTab('overview')}>
            <span className="logo-dot" />
            VIT Explorer
          </a>
          <div className="nav-links">
            {(['overview', 'blocks', 'validators', 'search'] as Tab[]).map(t => (
              <button key={t} className={`nav-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="nav-live">
            <span className="live-dot" />
            {loading ? 'syncing…' : `refreshing in ${countdown}s`}
          </div>
        </div>
        <div className="refresh-bar">
          <div className="refresh-bar-fill" style={{ width: `${(countdown / 15) * 100}%` }} />
        </div>
      </nav>

      {/* Page */}
      <main className="page">
        <div className="page-inner">
          {tab === 'overview' && (
            <OverviewView
              health={health} blocks={blocks} validators={validators}
              loading={loading} onBlockClick={setSelectedBlock} onTab={handleTab}
            />
          )}
          {tab === 'blocks' && (
            <BlocksView blocks={blocks} total={total} loading={loading} onBlockClick={setSelectedBlock} />
          )}
          {tab === 'validators' && (
            <ValidatorsView validators={validators} loading={loading} />
          )}
          {tab === 'search' && <SearchView />}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        VIT Chain Testnet · Chain ID 7764 · RPC{' '}
        <a href={`${CHAIN_URL}/docs`} target="_blank" rel="noreferrer">{CHAIN_URL}/rpc</a>
        {' '}·{' '}
        <a href="https://github.com/vitnetwork" target="_blank" rel="noreferrer">GitHub</a>
      </footer>

      {/* Block detail modal */}
      {selectedBlock && (
        <BlockDetail block={selectedBlock} onClose={() => setSelectedBlock(null)} />
      )}
    </div>
  )
}
