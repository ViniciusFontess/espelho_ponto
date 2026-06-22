import { motion } from 'framer-motion'
import { FileText, Sparkles, ArrowRight } from './Icons'
import { Topbar, StatusFooter, Ticks } from './Chrome'
import SebraeLogo from './SebraeLogo'
import { COLORS, FONT, GRAD, monoLabel } from './theme'

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
  transition: { duration: .5, delay: d, ease: [.22, 1, .36, 1] },
})

const PASSOS = [
  ['01', 'Envie o PDF', 'O documento mensal com várias pessoas, em um único arquivo.'],
  ['02', 'Escolha o molde', 'A plataforma identifica o tipo e separa cada pessoa automaticamente.'],
  ['03', 'Baixe organizado', 'Um .zip com uma pasta por pessoa, nomeada e pronta para arquivar.'],
]

export default function Landing({ onSelectMolde }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <Topbar />

      <div className="grid-bg" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <main style={{ maxWidth: 1040, margin: '0 auto', padding: '64px 24px 8px' }}>
          {/* hero */}
          <motion.div {...fade(0)} style={{ display: 'flex', gap: 44, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 460px', maxWidth: 640 }}>
              <div style={{ ...monoLabel, color: COLORS.blue, marginBottom: 18,
                display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 22, height: 1.5, background: COLORS.blue }} /> PLATAFORMA DE DOCUMENTOS · SEBRAE
              </div>
              <h1 style={{ fontSize: 46, lineHeight: 1.06, color: COLORS.ink, letterSpacing: '-.025em' }}>
                Separe e organize<br />documentos com <span style={{ color: COLORS.blue }}>precisão</span>.
              </h1>
              <p style={{ color: COLORS.muted, fontSize: 16.5, marginTop: 20, lineHeight: 1.55, maxWidth: 560 }}>
                Transforme um PDF com centenas de páginas em pastas individuais, nomeadas e validadas —
                em segundos, sem trabalho manual.
              </p>
            </div>
            {/* selo institucional SEBRAE */}
            <div style={{ position: 'relative', background: '#fff', border: `1px solid ${COLORS.line}`,
              padding: '36px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <Ticks color={COLORS.blue} />
              <SebraeLogo height={120} fill={COLORS.blue} />
              <span style={{ ...monoLabel, fontSize: 9.5, color: COLORS.muted, letterSpacing: '.18em' }}>UGP · DOCUMENTOS</span>
            </div>
          </motion.div>

          {/* como funciona */}
          <motion.div {...fade(.1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            marginTop: 44, border: `1px solid ${COLORS.line}`, background: '#fff' }}>
            {PASSOS.map(([n, t, d], i) => (
              <div key={n} style={{ padding: '22px 22px', borderLeft: i ? `1px solid ${COLORS.line}` : 'none' }}>
                <div style={{ ...monoLabel, fontSize: 22, letterSpacing: '.02em', color: COLORS.blue, fontWeight: 700 }}>{n}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.ink, marginTop: 10 }}>{t}</div>
                <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 }}>{d}</p>
              </div>
            ))}
          </motion.div>
        </main>
      </div>

      {/* modos */}
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 8px', width: '100%' }}>
        <motion.div {...fade(.18)} style={{ ...monoLabel, color: COLORS.muted, marginBottom: 16 }}>
          Escolha o modo de separação
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* modo molde — ativo */}
          <motion.div {...fade(.22)} whileHover={{ y: -3 }} onClick={onSelectMolde}
            style={{ position: 'relative', cursor: 'pointer', background: '#fff',
              border: `1.5px solid ${COLORS.blue}`, padding: 26, display: 'flex', flexDirection: 'column',
              minHeight: 224, boxShadow: `0 1px 0 ${COLORS.blue}, 10px 10px 0 ${COLORS.blueSoft}` }}>
            <Ticks color={COLORS.blue} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ width: 46, height: 46, background: GRAD.cta, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText color="#fff" />
              </div>
              <span style={{ ...monoLabel, fontSize: 10, color: COLORS.emerald,
                border: `1px solid ${COLORS.emerald}`, padding: '4px 9px' }}>DISPONÍVEL</span>
            </div>
            <div style={{ ...monoLabel, fontSize: 10, color: COLORS.muted, marginBottom: 6 }}>MODO 01</div>
            <h3 style={{ fontSize: 19, color: COLORS.ink }}>Separador com Molde</h3>
            <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 8, flex: 1, lineHeight: 1.5 }}>
              Para documentos de layout conhecido — espelho de ponto, holerite, contrato. Extração precisa por regras do molde.
            </p>
            <div style={{ marginTop: 18, background: GRAD.cta, color: '#fff', padding: '13px 16px',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Processar agora <ArrowRight color="#fff" />
            </div>
          </motion.div>

          {/* modo inteligente — em breve */}
          <motion.div {...fade(.28)} style={{ position: 'relative', background: '#fff',
            border: `1px solid ${COLORS.line}`, padding: 26, display: 'flex', flexDirection: 'column', minHeight: 224 }}>
            <Ticks />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ width: 46, height: 46, background: COLORS.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles color={COLORS.blue} />
              </div>
              <span style={{ ...monoLabel, fontSize: 10, color: COLORS.muted,
                border: `1px solid ${COLORS.line}`, padding: '4px 9px' }}>EM BREVE</span>
            </div>
            <div style={{ ...monoLabel, fontSize: 10, color: COLORS.muted, marginBottom: 6 }}>MODO 02</div>
            <h3 style={{ fontSize: 19, color: COLORS.ink }}>Separação Inteligente</h3>
            <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 8, flex: 1, lineHeight: 1.5 }}>
              Para qualquer PDF, sem molde pré-definido. A plataforma lê o documento, identifica os limites e extrai as
              informações automaticamente.
            </p>
            <div style={{ marginTop: 18, border: `1px solid ${COLORS.line}`, color: COLORS.muted,
              padding: '13px 16px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
              Em desenvolvimento
            </div>
          </motion.div>
        </div>
      </main>

      <div style={{ flex: 1 }} />
      <StatusFooter />
    </div>
  )
}
