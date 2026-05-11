import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const POLL_INTERVAL = 2000

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ presente, valido, dataHora }) {
  if (valido) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--emerald-light)', color: 'var(--emerald)',
          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ fontSize: 14 }}>✓</span> Assinado
        </span>
        {dataHora && (
          <span style={{ fontSize: 11, color: 'var(--muted)', paddingLeft: 4 }}>
            {dataHora}
          </span>
        )}
      </div>
    )
  }
  if (presente) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'var(--amber-light)', color: 'var(--amber)',
        padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      }}>
        ⚠ Hash inválido
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--red-light)', color: 'var(--red)',
      padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    }}>
      ✗ Não assinou
    </span>
  )
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────
function SummaryBar({ results }) {
  const total    = results.length
  const assinados = results.filter(r => r.hash_valido).length
  const nao      = results.filter(r => !r.hash_presente).length

  const cards = [
    { label: 'Total',      value: total,    bg: 'var(--navy)',    fg: '#fff' },
    { label: 'Assinados',  value: assinados, bg: 'var(--emerald)', fg: '#fff' },
    { label: 'Sem assin.', value: nao,       bg: 'var(--red)',     fg: '#fff' },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          style={{
            background: c.bg, color: c.fg,
            borderRadius: 'var(--radius-sm)',
            padding: '16px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            minWidth: 110,
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          }}
        >
          <span style={{ fontSize: 32, fontFamily: 'Syne', fontWeight: 800, lineHeight: 1 }}>
            {c.value}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, marginTop: 4, opacity: .85 }}>
            {c.label}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// ─── ResultsTable ─────────────────────────────────────────────────────────────
function ResultsTable({ results }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--navy)' }}>
            {['Nome', 'Matrícula', 'Cargo', 'Equipe', 'Período', 'Dias', 'Assinatura'].map(h => (
              <th key={h} style={{
                padding: '12px 16px', textAlign: 'left',
                color: '#fff', fontFamily: 'Syne', fontWeight: 600,
                fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {results.map((r, i) => {
              const accentColor = r.hash_valido ? 'var(--emerald)' : r.hash_presente ? 'var(--amber)' : 'var(--red)'
              return (
                <motion.tr
                  key={r.matricula + i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background: i % 2 === 0 ? '#fff' : '#fafaf7',
                    borderLeft: `3px solid ${accentColor}`,
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--navy)' }}>
                    {r.nome || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                    {r.matricula || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 160 }}>
                    {r.cargo || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 200, color: 'var(--muted)', fontSize: 12 }}>
                    {r.equipe || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {r.periodo || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      background: 'var(--bg)', borderRadius: 20,
                      padding: '2px 10px', fontSize: 12, fontWeight: 600,
                    }}>
                      {r.dias?.length ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge
                      presente={r.hash_presente}
                      valido={r.hash_valido}
                      dataHora={r.assinatura?.data_hora}
                    />
                  </td>
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}

// ─── UploadZone ───────────────────────────────────────────────────────────────
function UploadZone({ onFile, file }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.pdf')) onFile(f)
  }

  return (
    <motion.div
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      animate={{ scale: dragging ? 1.02 : 1 }}
      style={{
        border: `2px dashed ${dragging ? 'var(--coral)' : 'var(--navy)'}`,
        borderRadius: 'var(--radius)',
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? 'var(--coral-light)' : 'transparent',
        transition: 'background .2s, border-color .2s',
        animation: !file ? 'pulse-border 2.5s ease-in-out infinite' : 'none',
      }}
    >
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />

      {file ? (
        <div>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
          <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--navy)' }}>
            {file.name}
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {(file.size / 1024).toFixed(0)} KB — clique para trocar
          </p>
        </div>
      ) : (
        <div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 48, marginBottom: 12 }}
          >
            📂
          </motion.div>
          <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17, color: 'var(--navy)' }}>
            Arraste o PDF aqui
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            ou <strong style={{ color: 'var(--coral)' }}>clique para selecionar</strong>
          </p>
        </div>
      )}
    </motion.div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile]       = useState(null)
  const [status, setStatus]   = useState('idle')   // idle | uploading | processing | done | error
  const [results, setResults] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  const processar = async () => {
    if (!file) return
    setStatus('uploading')
    setResults([])

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const { job_id } = await res.json()
      setStatus('processing')
      poll(job_id)
    } catch (e) {
      setStatus('error')
      setErrorMsg(e.message)
    }
  }

  const poll = async (job_id) => {
    try {
      const res  = await fetch(`/results/${job_id}`)
      const data = await res.json()
      if (data.status === 'processing') {
        setTimeout(() => poll(job_id), POLL_INTERVAL)
        return
      }
      if (data.status === 'error') {
        setStatus('error')
        setErrorMsg(data.error)
        return
      }
      setResults(data.results)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setErrorMsg(e.message)
    }
  }

  const reset = () => {
    setFile(null)
    setStatus('idle')
    setResults([])
    setErrorMsg('')
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%)`,
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
        boxShadow: '0 2px 16px rgba(0,0,0,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 8, height: 36, background: 'var(--coral)',
            borderRadius: 4, flexShrink: 0,
          }} />
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-.01em' }}>
            Espelho Ponto
          </h1>
          <span style={{
            background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)',
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            SEBRAE
          </span>
        </div>
        {status === 'done' && (
          <button onClick={reset} style={{
            background: 'transparent', border: '1.5px solid rgba(255,255,255,.3)',
            color: 'rgba(255,255,255,.8)', padding: '6px 16px', borderRadius: 20,
            cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans',
          }}>
            Novo upload
          </button>
        )}
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Upload card */}
        <AnimatePresence>
          {status !== 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius)',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--navy)' }}>
                Upload do PDF Mensal
              </h2>

              <UploadZone file={file} onFile={setFile} />

              {status === 'idle' && file && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={processar}
                  style={{
                    marginTop: 16, width: '100%',
                    background: 'linear-gradient(135deg, var(--coral) 0%, #c24d00 100%)',
                    color: '#fff', border: 'none', padding: '14px',
                    borderRadius: 'var(--radius-sm)', fontSize: 15,
                    fontFamily: 'Syne', fontWeight: 700, cursor: 'pointer',
                    letterSpacing: '.02em',
                    boxShadow: '0 4px 16px rgba(232,93,4,.35)',
                  }}
                >
                  Processar PDF →
                </motion.button>
              )}

              {(status === 'uploading' || status === 'processing') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    marginTop: 20, display: 'flex', alignItems: 'center',
                    gap: 12, justifyContent: 'center',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--coral)',
                    animation: 'spin .8s linear infinite',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>
                    {status === 'uploading' ? 'Enviando PDF...' : 'Processando funcionários...'}
                  </span>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    marginTop: 16, background: 'var(--red-light)',
                    color: 'var(--red)', borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px', fontSize: 13, fontWeight: 500,
                  }}
                >
                  ✗ {errorMsg}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {status === 'done' && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>
                  Resultados
                </h2>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {results.length} {results.length === 1 ? 'funcionário' : 'funcionários'} processados
                </span>
              </div>

              <SummaryBar results={results} />

              <div style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius)',
                boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
                overflow: 'hidden',
              }}>
                <ResultsTable results={results} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  )
}
