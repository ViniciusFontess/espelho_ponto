// Elementos de moldura compartilhados: topbar, rodapé técnico, cantos crosshair.
import SebraeLogo from './SebraeLogo'
import { COLORS, FONT, monoLabel } from './theme'

// Marca de canto (crosshair) — acento "blueprint" nos cards.
export function Ticks({ color = COLORS.line }) {
  const L = 9, t = -1
  const mark = (pos) => ({
    position: 'absolute', width: L, height: L, ...pos, pointerEvents: 'none',
  })
  const h = { position: 'absolute', background: color }
  return (
    <>
      <span style={mark({ top: t, left: t })}><i style={{ ...h, top: 0, left: 0, width: L, height: 1.5 }} /><i style={{ ...h, top: 0, left: 0, width: 1.5, height: L }} /></span>
      <span style={mark({ top: t, right: t })}><i style={{ ...h, top: 0, right: 0, width: L, height: 1.5 }} /><i style={{ ...h, top: 0, right: 0, width: 1.5, height: L }} /></span>
      <span style={mark({ bottom: t, left: t })}><i style={{ ...h, bottom: 0, left: 0, width: L, height: 1.5 }} /><i style={{ ...h, bottom: 0, left: 0, width: 1.5, height: L }} /></span>
      <span style={mark({ bottom: t, right: t })}><i style={{ ...h, bottom: 0, right: 0, width: L, height: 1.5 }} /><i style={{ ...h, bottom: 0, right: 0, width: 1.5, height: L }} /></span>
    </>
  )
}

export function Topbar({ onBack }) {
  return (
    <header style={{ background: '#fff', borderBottom: `1px solid ${COLORS.line}`,
      height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {onBack && (
          <button onClick={onBack} style={{ ...monoLabel, fontSize: 11, color: COLORS.blue, background: 'none',
            border: `1px solid ${COLORS.line}`, padding: '7px 12px', cursor: 'pointer' }}>← VOLTAR</button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SebraeLogo height={26} fill={COLORS.blue} />
          <div style={{ width: 1, height: 26, background: COLORS.line }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.ink }}>Separador de Documentos</div>
            <div style={{ ...monoLabel, fontSize: 9.5, color: COLORS.muted, letterSpacing: '.1em' }}>UGP · PROCESSAMENTO DOCUMENTAL</div>
          </div>
        </div>
      </div>
      <span style={{ ...monoLabel, fontSize: 10, color: COLORS.blue, background: COLORS.blueSoft,
        padding: '6px 12px', border: `1px solid ${COLORS.blue}22` }}>SEBRAE</span>
    </header>
  )
}

export function StatusFooter() {
  const cell = { ...monoLabel, fontSize: 10, color: COLORS.muted, letterSpacing: '.1em' }
  return (
    <footer style={{ borderTop: `1px solid ${COLORS.line}`, background: '#fff', marginTop: 40,
      padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <span style={cell}>
        <span style={{ display: 'inline-block', width: 7, height: 7, background: COLORS.emerald, marginRight: 8, verticalAlign: 'middle' }} />
        SISTEMA OPERACIONAL
      </span>
      <span style={cell}>SEBRAE · UGP · SEPARADOR DE DOCUMENTOS v1</span>
    </footer>
  )
}
