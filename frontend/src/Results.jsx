import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Topbar, StatusFooter } from './Chrome'
import { Download, Folder } from './Icons'
import { COLORS, FONT, GRAD, monoLabel } from './theme'

const POLL = 2000

function statusAssinatura(f) {
  if (f.tipo !== 'espelho') return null
  if (f.hash_valido) return { label: 'Assinado', cor: COLORS.emerald, bg: COLORS.emeraldSoft }
  if (f.hash_presente) return { label: 'Assinatura inválida', cor: COLORS.amber, bg: COLORS.amberSoft }
  return { label: 'Não assinou', cor: COLORS.red, bg: COLORS.redSoft }
}

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
  const analise = useMemo(() => {
    const ehEspelho = funcs.some(f => f.tipo === 'espelho')
    const assinados = funcs.filter(f => f.hash_valido).length
    const invalidas = funcs.filter(f => f.hash_presente && !f.hash_valido).length
    const naoAssinou = funcs.filter(f => f.tipo === 'espelho' && !f.hash_presente).length
    const competencias = [...new Set(funcs.map(f => f.periodo).filter(Boolean))]
    const porCompetencia = {}
    funcs.forEach(f => { const c = f.periodo || '-'; porCompetencia[c] = (porCompetencia[c] || 0) + 1 })
    const colunas = COLUNAS.filter(col => funcs.some(f => f[col.key] != null && f[col.key] !== ''))
    return { ehEspelho, assinados, invalidas, naoAssinou, competencias, porCompetencia, colunas }
  }, [funcs])

  if (status === 'processing') return (
    <Frame><Centered><Spinner /><p style={{ color: COLORS.muted, fontSize: 14 }}>Separando documentos…</p>
      <span style={{ ...monoLabel, fontSize: 10, color: COLORS.muted }}>ISSO LEVA POUCOS SEGUNDOS</span></Centered></Frame>
  )
  if (status === 'error') return (
    <Frame onBack={onBack}><Centered>
      <p style={{ color: COLORS.red, fontWeight: 600 }}>Não foi possível processar</p>
      <p style={{ color: COLORS.muted, fontSize: 13 }}>{erro}</p>
      <button onClick={onReset} style={btnGhost}>Voltar ao início</button></Centered></Frame>
  )

  const total = funcs.length
  const pct = (n) => total ? Math.round((n / total) * 100) : 0
  const kpis = [
    { label: 'Documentos', valor: total, cor: COLORS.blue },
    ...(analise.ehEspelho ? [
      { label: 'Assinados', valor: analise.assinados, cor: COLORS.emerald, sub: `${pct(analise.assinados)}%` },
      { label: 'Sem assinatura', valor: analise.naoAssinou, cor: COLORS.red, sub: `${pct(analise.naoAssinou)}%` },
      { label: 'Inválidas', valor: analise.invalidas, cor: COLORS.amber },
    ] : []),
    { label: analise.competencias.length === 1 ? 'Competência' : 'Competências', valor: analise.competencias.length,
      cor: COLORS.ink, sub: analise.competencias.length === 1 ? analise.competencias[0] : undefined },
  ]

  return (
    <Frame onBack={onBack}>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 8px', width: '100%' }}>
        {/* título + ações */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 4 }}>
          <div>
            <div style={{ ...monoLabel, color: COLORS.blue, marginBottom: 8 }}>RELATÓRIO DE PROCESSAMENTO</div>
            <h2 style={{ fontSize: 26, color: COLORS.ink }}>Processamento concluído</h2>
            <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 6 }}>
              <strong style={{ color: COLORS.ink }}>{total}</strong> {total === 1 ? 'documento separado' : 'documentos separados'} em pastas individuais ·
              molde <span style={{ fontFamily: FONT.mono, color: COLORS.blue }}>{data.molde_id}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onReset} style={btnGhost}>Novo upload</button>
            <a href={`/download/${jobId}`} style={{ textDecoration: 'none', background: GRAD.cta, color: '#fff',
              fontWeight: 700, fontSize: 13, padding: '11px 18px', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
              <Download color="#fff" /> Baixar .zip</a>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 0,
          border: `1px solid ${COLORS.line}`, marginTop: 24, background: '#fff' }}>
          {kpis.map((k, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }}
              style={{ padding: '18px 20px', borderLeft: i ? `1px solid ${COLORS.line}` : 'none', borderTop: `2px solid ${k.cor}` }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 30, fontWeight: 700, color: k.cor, lineHeight: 1 }}>{k.valor}</div>
              <div style={{ ...monoLabel, fontSize: 9.5, color: COLORS.muted, marginTop: 9 }}>{k.label}</div>
              {k.sub && <div style={{ fontFamily: FONT.mono, fontSize: 11, color: k.cor, fontWeight: 700, marginTop: 3 }}>{k.sub}</div>}
            </motion.div>
          ))}
        </div>

        {/* controle de pastas funcionais */}
        {data.estatisticas && <ControlePastas e={data.estatisticas} />}

        {/* status de assinatura */}
        {analise.ehEspelho && (
          <Secao titulo="Distribuição por status de assinatura">
            <BarraStatus total={total} segmentos={[
              { label: 'Assinados', n: analise.assinados, cor: COLORS.emerald },
              { label: 'Assinatura inválida', n: analise.invalidas, cor: COLORS.amber },
              { label: 'Não assinaram', n: analise.naoAssinou, cor: COLORS.red },
            ].filter(s => s.n > 0)} />
          </Secao>
        )}

        {/* por competência */}
        <Secao titulo="Documentos por competência">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, border: `1px solid ${COLORS.line}`, background: '#fff' }}>
            {Object.entries(analise.porCompetencia).sort().map(([comp, n], i) => (
              <div key={comp} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                borderLeft: i ? `1px solid ${COLORS.line}` : 'none' }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 12.5, color: COLORS.ink }}>{comp}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 700, color: '#fff',
                  background: COLORS.blue, padding: '1px 8px' }}>{n}</span>
              </div>
            ))}
          </div>
        </Secao>

        {/* pastas funcionais geradas */}
        <Secao titulo="Pastas funcionais geradas">
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.line}`, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.ink}` }}>
                  <th style={th}>#</th>
                  <th style={th}>Pasta funcional</th>
                  {analise.colunas.filter(c => c.key !== 'nome').map(c => <th key={c.key} style={th}>{c.label}</th>)}
                  {analise.ehEspelho && <th style={th}>Status</th>}
                </tr>
              </thead>
              <tbody>
                {funcs.map((f, i) => {
                  const st = statusAssinatura(f)
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                      <td style={{ ...td, fontFamily: FONT.mono, color: COLORS.muted }}>{String(i + 1).padStart(2, '0')}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Folder size={15} color={COLORS.blue} />
                          <div>
                            <div style={{ fontWeight: 600, color: COLORS.ink }}>{f.nome || '-'}</div>
                            <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: COLORS.muted, marginTop: 1 }}>
                              {f.pasta ? `${f.pasta}/` : '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      {analise.colunas.filter(c => c.key !== 'nome').map(c => (
                        <td key={c.key} style={{ ...td, ...(c.key === 'nome' ? { fontWeight: 600, color: COLORS.ink } : { color: COLORS.inkSoft }),
                          ...(['matricula', 'cpf', 'pagina', 'periodo'].includes(c.key) ? { fontFamily: FONT.mono, fontSize: 12.5 } : {}) }}>
                          {f[c.key] != null && f[c.key] !== '' ? String(f[c.key]) : '-'}
                        </td>
                      ))}
                      {analise.ehEspelho && (
                        <td style={td}>
                          {st ? <span style={{ ...monoLabel, fontSize: 10, padding: '3px 9px', color: st.cor,
                            background: st.bg, border: `1px solid ${st.cor}33` }}>{st.label}</span>
                            : <span style={{ color: COLORS.muted }}>-</span>}
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
    </Frame>
  )
}

// ─── moldura ──────────────────────────────────────────────────────────────────
function Frame({ children, onBack }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <Topbar onBack={onBack} />
      {children}
      <div style={{ flex: 1 }} />
      <StatusFooter />
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h3 style={{ ...monoLabel, fontSize: 11, color: COLORS.muted, marginBottom: 12 }}>{titulo}</h3>
      {children}
    </section>
  )
}

// Painel de controle operacional das pastas funcionais.
function ControlePastas({ e }) {
  const cells = [
    { n: e.pastas_funcionais, label: 'Pastas funcionais', sub: 'uma por pessoa' },
    { n: e.subpastas_competencia, label: 'Subpastas', sub: 'por competência' },
    { n: e.pdf_gravados, label: 'Documentos gravados', sub: 'páginas individuais (.pdf)' },
    { n: e.json_gravados, label: 'Registros gravados', sub: 'dados extraídos (.json)' },
    { n: e.arquivos_gravados, label: 'Arquivos no total', sub: 'prontos no .zip' },
  ]
  return (
    <Secao titulo="Controle de pastas funcionais">
      <div style={{ border: `1px solid ${COLORS.line}`, background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
          {cells.map((c, i) => (
            <div key={i} style={{ padding: '16px 18px', borderLeft: i ? `1px solid ${COLORS.line}` : 'none' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 26, fontWeight: 700, color: COLORS.ink, lineHeight: 1 }}>{c.n}</div>
              <div style={{ ...monoLabel, fontSize: 9, color: COLORS.muted, marginTop: 8 }}>{c.label}</div>
              <div style={{ fontSize: 10.5, color: COLORS.muted, marginTop: 3 }}>{c.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${COLORS.line}`, background: COLORS.bg, padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 7, height: 7, background: COLORS.emerald, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
            <strong style={{ color: COLORS.ink }}>{e.pastas_funcionais}</strong> {e.pastas_funcionais === 1 ? 'pasta funcional preparada' : 'pastas funcionais preparadas'} ·{' '}
            <strong style={{ color: COLORS.ink }}>{e.arquivos_gravados}</strong> arquivos gravados · prontos para arquivar no servidor
          </span>
        </div>
      </div>
    </Secao>
  )
}

function BarraStatus({ segmentos, total }) {
  return (
    <div>
      <div style={{ display: 'flex', height: 16, border: `1px solid ${COLORS.line}`, background: '#fff' }}>
        {segmentos.map((s, i) => (
          <div key={i} title={`${s.label}: ${s.n}`} style={{ width: `${(s.n / total) * 100}%`, background: s.cor }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 12 }}>
        {segmentos.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: COLORS.inkSoft }}>
            <span style={{ width: 10, height: 10, background: s.cor }} />
            <strong style={{ fontFamily: FONT.mono }}>{s.n}</strong> {s.label}
            <span style={{ color: COLORS.muted, fontFamily: FONT.mono, fontSize: 11 }}>{Math.round((s.n / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const th = { padding: '11px 14px', textAlign: 'left', color: COLORS.ink, fontFamily: FONT.mono,
  fontWeight: 500, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }
const td = { padding: '11px 14px', whiteSpace: 'nowrap' }
const btnGhost = { background: '#fff', border: `1px solid ${COLORS.line}`, color: COLORS.inkSoft,
  padding: '11px 16px', fontFamily: FONT.sans, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
const Centered = ({ children }) => (
  <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', padding: 40 }}>{children}</main>)
const Spinner = () => (
  <div style={{ width: 28, height: 28, border: `2.5px solid ${COLORS.line}`, borderTopColor: COLORS.blue,
    borderRadius: '50%', animation: 'spin .8s linear infinite' }} />)
