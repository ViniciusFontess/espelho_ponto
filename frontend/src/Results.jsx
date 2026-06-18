import { useEffect, useMemo, useState } from 'react'
import { COLORS, GRAD } from './theme'

const POLL = 2000

// ─── status de assinatura por documento (apenas espelho assinado) ─────────────
function statusAssinatura(f) {
  if (f.tipo !== 'espelho') return null  // jornada não tem assinatura
  if (f.hash_valido) return { label: 'Assinado', cor: COLORS.emerald, bg: COLORS.emeraldLight }
  if (f.hash_presente) return { label: 'Assinatura inválida', cor: COLORS.amber, bg: COLORS.amberLight }
  return { label: 'Não assinou', cor: COLORS.red, bg: COLORS.redLight }
}

// colunas candidatas da tabela; só aparecem se houver dado em algum registro
const COLUNAS = [
  { key: 'nome', label: 'Nome' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'cpf', label: 'CPF' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'periodo', label: 'Competência' },
  { key: 'pagina', label: 'Página' },
]

export default function Results({ jobId, onReset, onBack }) {
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

  const funcs = data?.results || []

  // ── métricas derivadas (memoizadas) ──
  const analise = useMemo(() => {
    const ehEspelho = funcs.some(f => f.tipo === 'espelho')
    const assinados = funcs.filter(f => f.hash_valido).length
    const invalidas = funcs.filter(f => f.hash_presente && !f.hash_valido).length
    const naoAssinou = funcs.filter(f => f.tipo === 'espelho' && !f.hash_presente).length
    const competencias = [...new Set(funcs.map(f => f.periodo).filter(Boolean))]
    // contagem por competência
    const porCompetencia = {}
    funcs.forEach(f => {
      const c = f.periodo || '—'
      porCompetencia[c] = (porCompetencia[c] || 0) + 1
    })
    // colunas presentes
    const colunas = COLUNAS.filter(col => funcs.some(f => f[col.key] != null && f[col.key] !== ''))
    return { ehEspelho, assinados, invalidas, naoAssinou, competencias, porCompetencia, colunas }
  }, [funcs])

  if (status === 'processing') return <Centered>
    <Spinner /> <p style={{ color: COLORS.muted }}>Processando documentos...</p></Centered>

  if (status === 'error') return <Centered>
    <p style={{ color: COLORS.red }}>✗ {erro}</p>
    <button onClick={onReset} style={btnGhost}>Voltar</button></Centered>

  const total = funcs.length
  const pct = (n) => total ? Math.round((n / total) * 100) : 0

  // KPIs adaptados ao tipo de documento
  const kpis = [
    { label: 'Documentos processados', valor: total, cor: COLORS.blue },
    ...(analise.ehEspelho ? [
      { label: 'Assinados', valor: analise.assinados, cor: COLORS.emerald, sub: `${pct(analise.assinados)}%` },
      { label: 'Sem assinatura', valor: analise.naoAssinou, cor: COLORS.red, sub: `${pct(analise.naoAssinou)}%` },
      { label: 'Assinatura inválida', valor: analise.invalidas, cor: COLORS.amber },
    ] : []),
    { label: analise.competencias.length === 1 ? 'Competência' : 'Competências', valor: analise.competencias.length, cor: COLORS.purple,
      sub: analise.competencias.length === 1 ? analise.competencias[0] : undefined },
  ]

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px' }}>
      {/* cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={btnBack}>← Voltar</button>
          <h2 style={{ fontSize: 22, color: COLORS.ink }}>Relatório de processamento</h2>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href={`/download/${jobId}`} style={{ textDecoration: 'none', background: GRAD.cta, color: '#fff',
            fontWeight: 700, fontSize: 13, padding: '10px 18px', borderRadius: 10 }}>⬇ Baixar ZIP</a>
          <button onClick={onReset} style={btnGhost}>Novo upload</button>
        </div>
      </div>

      {/* faixa de contexto */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ background: COLORS.purpleLight, color: COLORS.purple, fontWeight: 700,
          fontSize: 12, padding: '5px 14px', borderRadius: 20 }}>molde: {data.molde_id}</span>
        <span style={{ color: COLORS.muted, fontSize: 13 }}>
          {total} {total === 1 ? 'documento separado' : 'documentos separados'} em pastas individuais
        </span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 12, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: '16px 18px', borderTop: `3px solid ${k.cor}` }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: k.cor, lineHeight: 1 }}>{k.valor}</div>
            <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 6, fontWeight: 500 }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: 11, color: k.cor, fontWeight: 700, marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* agrupamento por status (somente espelho) */}
      {analise.ehEspelho && (
        <Secao titulo="Distribuição por status de assinatura">
          <BarraStatus
            segmentos={[
              { label: 'Assinados', n: analise.assinados, cor: COLORS.emerald },
              { label: 'Assinatura inválida', n: analise.invalidas, cor: COLORS.amber },
              { label: 'Não assinaram', n: analise.naoAssinou, cor: COLORS.red },
            ].filter(s => s.n > 0)}
            total={total}
          />
        </Secao>
      )}

      {/* agrupamento por competência */}
      <Secao titulo="Documentos por competência">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(analise.porCompetencia).sort().map(([comp, n]) => (
            <span key={comp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '6px 14px' }}>
              <span style={{ fontSize: 12.5, color: COLORS.ink, fontWeight: 600 }}>📅 {comp}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: COLORS.purple,
                background: COLORS.purpleLight, borderRadius: 20, padding: '1px 9px' }}>{n}</span>
            </span>
          ))}
        </div>
      </Secao>

      {/* tabela detalhada */}
      <Secao titulo="Detalhamento por documento">
        <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: 12, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: GRAD.header }}>
                <th style={thStyle}>#</th>
                {analise.colunas.map(c => <th key={c.key} style={thStyle}>{c.label}</th>)}
                {analise.ehEspelho && <th style={thStyle}>Status</th>}
              </tr>
            </thead>
            <tbody>
              {funcs.map((f, i) => {
                const st = statusAssinatura(f)
                return (
                  <tr key={i} style={{ background: i % 2 ? '#faf9ff' : '#fff', borderTop: `1px solid ${COLORS.border}` }}>
                    <td style={{ ...tdStyle, color: COLORS.muted, fontWeight: 700 }}>{i + 1}</td>
                    {analise.colunas.map(c => (
                      <td key={c.key} style={{ ...tdStyle, ...(c.key === 'nome' ? { fontWeight: 600, color: COLORS.ink } : { color: '#52507a' }) }}>
                        {f[c.key] != null && f[c.key] !== '' ? String(f[c.key]) : '—'}
                      </td>
                    ))}
                    {analise.ehEspelho && (
                      <td style={tdStyle}>
                        {st ? <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px',
                          borderRadius: 20, color: st.cor, background: st.bg }}>{st.label}</span>
                          : <span style={{ color: COLORS.muted, fontSize: 12 }}>—</span>}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Secao>
    </main>
  )
}

// ─── subcomponentes ───────────────────────────────────────────────────────────
function Secao({ titulo, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: COLORS.purpleDark, textTransform: 'uppercase',
        letterSpacing: '.05em', marginBottom: 12 }}>{titulo}</h3>
      {children}
    </section>
  )
}

function BarraStatus({ segmentos, total }) {
  return (
    <div>
      <div style={{ display: 'flex', height: 22, borderRadius: 11, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
        {segmentos.map((s, i) => (
          <div key={i} title={`${s.label}: ${s.n}`} style={{ width: `${(s.n / total) * 100}%`, background: s.cor }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10 }}>
        {segmentos.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: COLORS.ink }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.cor }} />
            <strong>{s.n}</strong> {s.label}
            <span style={{ color: COLORS.muted }}>({Math.round((s.n / total) * 100)}%)</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const thStyle = { padding: '11px 14px', textAlign: 'left', color: '#fff', fontWeight: 700,
  fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 14px', whiteSpace: 'nowrap' }
const btnGhost = { background: 'transparent', border: `1.5px solid ${COLORS.border}`,
  color: COLORS.muted, padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontFamily: 'Roboto' }
const btnBack = { background: COLORS.purpleLight, border: 'none', color: COLORS.purple,
  fontWeight: 700, padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontFamily: 'Roboto', fontSize: 13 }
const Centered = ({ children }) => (
  <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 12,
    alignItems: 'center', justifyContent: 'center' }}>{children}</div>)
const Spinner = () => (
  <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid #e5e1f0',
    borderTopColor: COLORS.blue, animation: 'spin .8s linear infinite' }} />)
