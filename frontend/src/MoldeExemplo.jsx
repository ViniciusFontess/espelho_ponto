import { motion } from 'framer-motion'
import { rotulo } from './variaveis'
import { COLORS, monoLabel } from './theme'

// Mostra a 1ª página real do PDF-modelo para a pessoa reconhecer o documento
// antes de anexar, evitando confundir o molde.
export default function MoldeExemplo({ molde, onClose }) {
  if (!molde) return null
  const temImagem = molde.status !== 'exemplo'
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,18,34,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${COLORS.line}`, width: 'min(820px, 100%)',
          maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(15,18,34,.3)' }}>
        {/* cabeçalho do modal */}
        <div style={{ position: 'sticky', top: 0, background: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${COLORS.line}`, zIndex: 1 }}>
          <div>
            <div style={{ ...monoLabel, fontSize: 10, color: COLORS.blue, marginBottom: 4 }}>EXEMPLO DO MOLDE</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.ink }}>{molde.nome}</div>
          </div>
          <button onClick={onClose} style={{ ...monoLabel, fontSize: 11, background: 'none',
            border: `1px solid ${COLORS.line}`, padding: '7px 12px', cursor: 'pointer', color: COLORS.muted }}>FECHAR ✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr' }}>
          {/* página real do documento */}
          <div style={{ padding: 18, borderRight: `1px solid ${COLORS.line}`, background: COLORS.bg }}>
            {temImagem ? (
              <img src={`/exemplos/${molde.id}.png`} alt={`Exemplo do molde ${molde.nome}`}
                style={{ width: '100%', display: 'block', border: `1px solid ${COLORS.line}`, background: '#fff' }} />
            ) : (
              <div style={{ background: '#fff', border: `1px solid ${COLORS.line}`, padding: '40px 20px',
                textAlign: 'center', color: COLORS.muted, fontSize: 13 }}>
                <div style={{ ...monoLabel, fontSize: 11, color: COLORS.ink, marginBottom: 12 }}>EXEMPLO EM BREVE</div>
                Este molde está em desenvolvimento.<br />O exemplo será disponibilizado em breve.
              </div>
            )}
            {temImagem && (
              <div style={{ ...monoLabel, fontSize: 9, color: COLORS.muted, marginTop: 8, textAlign: 'center' }}>
                1ª PÁGINA DO DOCUMENTO · UMA POR PESSOA
              </div>
            )}
          </div>

          {/* explicação */}
          <div style={{ padding: 22 }}>
            <p style={{ fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 1.6 }}>
              Confira se o seu PDF <strong>se parece com este</strong> antes de anexar. Cada pessoa ocupa uma página,
              e a plataforma separa todas automaticamente.
            </p>
            {temImagem && (
              <>
                <div style={{ ...monoLabel, fontSize: 9.5, color: COLORS.muted, margin: '20px 0 10px' }}>O QUE É LIDO DESTE MOLDE</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {molde.variaveis.map(v => (
                    <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: COLORS.inkSoft }}>
                      <span style={{ width: 6, height: 6, background: COLORS.blue }} />{rotulo(v)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
