import { motion } from 'framer-motion'
import SebraeLogo from './SebraeLogo'
import { COLORS, GRAD } from './theme'

function Header() {
  return (
    <header style={{ background: GRAD.header, padding: '16px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SebraeLogo height={30} />
        <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,.25)' }} />
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.15 }}>
          Separador de Documentos
          <small style={{ display: 'block', fontWeight: 400, fontSize: 10, color: '#c9b8ff' }}>
            Plataforma inteligente · UGP
          </small>
        </div>
      </div>
      <span style={{ background: 'rgba(255,255,255,.12)', color: '#e9e2ff', fontSize: 10,
        fontWeight: 700, padding: '5px 12px', borderRadius: 20, letterSpacing: '.08em' }}>SEBRAE</span>
    </header>
  )
}

export default function Landing({ onSelectMolde }) {
  return (
    <div>
      <Header />
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: 26, color: COLORS.ink }}>Como você quer processar hoje?</h1>
        <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 4, marginBottom: 28 }}>
          Escolha o tipo de separação. Documentos com layout conhecido usam molde; o resto vai pela IA.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <motion.div whileHover={{ y: -4 }} onClick={onSelectMolde}
            style={{ cursor: 'pointer', background: 'linear-gradient(160deg,#fff,#f3efff)',
              border: `1.5px solid ${COLORS.blue}`, borderRadius: 16, padding: 24,
              boxShadow: '0 6px 22px rgba(29,101,196,.18)', minHeight: 190,
              display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: GRAD.cta,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>📄</div>
            <h3 style={{ fontSize: 18, color: COLORS.ink }}>Separador com Molde</h3>
            <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 6, flex: 1 }}>
              Para documentos de layout conhecido — espelho de ponto, holerite, contrato. Extração precisa por regras do molde.
            </p>
            <div style={{ marginTop: 14, background: GRAD.cta, color: '#fff', borderRadius: 10,
              padding: 12, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>Processar agora →</div>
          </motion.div>

          <div style={{ background: '#f1eefb', border: '1.5px dashed #c9bdf0', borderRadius: 16,
            padding: 24, minHeight: 190, display: 'flex', flexDirection: 'column', opacity: .92 }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: '#e0d8f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>🤖</div>
            <h3 style={{ fontSize: 18, color: COLORS.ink }}>Separador com IA</h3>
            <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 6, flex: 1 }}>
              Para qualquer PDF, sem molde. Uma IA lê o documento, identifica os limites e extrai as variáveis sozinha.
            </p>
            <div style={{ marginTop: 14, border: '1.5px solid #d6ccf2', color: '#9a8fc0',
              borderRadius: 10, padding: 12, fontWeight: 500, fontSize: 13, textAlign: 'center' }}>
              Em breve
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
