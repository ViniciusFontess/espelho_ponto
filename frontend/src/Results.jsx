import { useEffect, useState } from 'react'
import { COLORS, GRAD } from './theme'

const POLL = 2000

export default function Results({ jobId, onReset }) {
  const [status, setStatus] = useState('processing')
  const [data, setData] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch(`/results/${jobId}`)
        const d = await r.json()
        if (!alive) return
        if (d.status === 'processing') { setTimeout(poll, POLL); return }
        if (d.status === 'error') { setStatus('error'); setErro(d.error); return }
        setData(d); setStatus('done')
      } catch (e) { if (alive) { setStatus('error'); setErro(e.message) } }
    }
    poll()
    return () => { alive = false }
  }, [jobId])

  if (status === 'processing') return <Centered>
    <Spinner /> <p style={{ color: COLORS.muted }}>Processando documentos...</p></Centered>

  if (status === 'error') return <Centered>
    <p style={{ color: '#dc2626' }}>✗ {erro}</p>
    <button onClick={onReset} style={btnGhost}>Voltar</button></Centered>

  const funcs = data.results || []
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, color: COLORS.ink }}>Resultados</h2>
        <button onClick={onReset} style={btnGhost}>Novo upload</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ background: COLORS.purpleLight, color: COLORS.purple, fontWeight: 700,
          fontSize: 12, padding: '5px 14px', borderRadius: 20 }}>{data.molde_id}</span>
        <span style={{ color: COLORS.muted, fontSize: 13 }}>{funcs.length} documentos separados</span>
        <a href={`/download/${jobId}`} style={{ marginLeft: 'auto', textDecoration: 'none',
          background: GRAD.cta, color: '#fff', fontWeight: 700, fontSize: 13,
          padding: '10px 18px', borderRadius: 10 }}>⬇ Baixar ZIP</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
        {funcs.map((f, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${COLORS.border}`,
            borderRadius: 12, padding: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.ink, overflow: 'hidden',
              whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.nome || '—'}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {f.periodo && <Tag>📅 {f.periodo}</Tag>}
              {f.matricula && <Tag>nº {f.matricula}</Tag>}
              {f.hash_valido && <Tag c="#059669" bg="#d1fae5">✓ assinado</Tag>}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

const Tag = ({ children, c = '#7a6fa8', bg = '#f1eefb' }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
    background: bg, color: c }}>{children}</span>)
const btnGhost = { background: 'transparent', border: `1.5px solid ${COLORS.border}`,
  color: COLORS.muted, padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontFamily: 'Roboto' }
const Centered = ({ children }) => (
  <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 12,
    alignItems: 'center', justifyContent: 'center' }}>{children}</div>)
const Spinner = () => (
  <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid #e5e1f0',
    borderTopColor: COLORS.blue, animation: 'spin .8s linear infinite' }} />)
