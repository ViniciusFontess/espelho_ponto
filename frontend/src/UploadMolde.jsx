import { useEffect, useRef, useState } from 'react'
import { COLORS, GRAD } from './theme'
import SebraeLogo from './SebraeLogo'

export default function UploadMolde({ onBack, onDone }) {
  const [moldes, setMoldes] = useState([])
  const [moldeId, setMoldeId] = useState('')
  const [selecionadas, setSelecionadas] = useState([])
  const [file, setFile] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch('/moldes').then(r => r.json()).then(ms => {
      setMoldes(ms)
      const primeiro = ms.find(m => m.status === 'ativo') || ms[0]
      if (primeiro) { setMoldeId(primeiro.id); setSelecionadas(primeiro.variaveis) }
    })
  }, [])

  const molde = moldes.find(m => m.id === moldeId)
  const ehExemplo = molde?.status === 'exemplo'

  const trocarMolde = (id) => {
    setMoldeId(id)
    const m = moldes.find(x => x.id === id)
    setSelecionadas(m ? m.variaveis : [])
    setErro('')
  }

  const toggleVar = (v) =>
    setSelecionadas(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])

  const processar = async () => {
    if (!file) { setErro('Selecione um PDF.'); return }
    if (ehExemplo) { setErro('Este molde ainda está em desenvolvimento.'); return }
    setEnviando(true); setErro('')
    const form = new FormData()
    form.append('file', file)
    form.append('molde_id', moldeId)
    form.append('variaveis', JSON.stringify(selecionadas))
    try {
      const res = await fetch('/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error((await res.json()).error)
      const { job_id } = await res.json()
      onDone(job_id)
    } catch (e) { setErro(e.message); setEnviando(false) }
  }

  return (
    <div>
      <header style={{ background: GRAD.header, padding: '12px 22px', display: 'flex',
        alignItems: 'center', gap: 12, color: '#fff' }}>
        <span onClick={onBack} style={{ cursor: 'pointer', fontSize: 12, color: '#c9b8ff' }}>← Voltar</span>
        <SebraeLogo height={22} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Separador com Molde</span>
      </header>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        <div style={{ gridColumn: '1 / -1' }}>
          <Label n="1">Arquivo PDF</Label>
          <div onClick={() => inputRef.current.click()}
            style={{ border: `2px dashed ${COLORS.blue}`, borderRadius: 12, background: '#fff',
              padding: 22, textAlign: 'center', cursor: 'pointer' }}>
            <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
            <div style={{ fontSize: 28 }}>⬆️</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6, color: COLORS.ink }}>
              {file ? file.name : 'Arraste ou clique para selecionar o PDF'}
            </div>
            {file && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
              {(file.size / 1024).toFixed(0)} KB</div>}
          </div>
        </div>

        <div>
          <Label n="2">O que extrair</Label>
          <select value={moldeId} onChange={e => trocarMolde(e.target.value)}
            style={selectStyle}>
            {moldes.map(m => (
              <option key={m.id} value={m.id}>
                {m.nome}{m.status === 'exemplo' ? ' (exemplo)' : ''}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
            {molde?.variaveis.map(v => {
              const on = selecionadas.includes(v)
              return (
                <span key={v} onClick={() => toggleVar(v)} style={{
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '5px 11px',
                  borderRadius: 20, border: '1.5px solid',
                  ...(on ? { background: GRAD.cta, color: '#fff', borderColor: 'transparent' }
                         : { background: '#f1eefb', color: '#7a6fa8', borderColor: '#e0d8f7' }),
                }}>{on ? '✓ ' : ''}{v}</span>
              )
            })}
          </div>
          {ehExemplo && <p style={{ fontSize: 11.5, color: COLORS.amber, marginTop: 8 }}>
            🚧 Molde em desenvolvimento — seleção apenas demonstrativa.</p>}
        </div>

        <div>
          <Label n="3">Destino</Label>
          <select disabled style={{ ...selectStyle, opacity: .8 }}>
            <option>Organizar por: Nome / Competência</option>
          </select>
          <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 10,
            padding: '12px 14px', marginTop: 10, fontFamily: "'Roboto Mono', monospace",
            fontSize: 11.5, color: '#52507a', lineHeight: 1.9 }}>
            📁 /Pasta Funcional/<br />
            &nbsp;&nbsp;└ 📁 NOME_FUNCIONARIO/<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ 📁 MM_AAAA/<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ 📄 dados.json + pagina.pdf
          </div>
          <p style={{ fontSize: 10.5, color: COLORS.muted, marginTop: 6 }}>
            No v1 o resultado sai num .zip pronto para arquivar.</p>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          {erro && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10,
            padding: '10px 14px', fontSize: 12.5, marginBottom: 10 }}>✗ {erro}</div>}
          <button onClick={processar} disabled={enviando || ehExemplo}
            style={{ width: '100%', background: ehExemplo ? '#cbb' : GRAD.cta, color: '#fff',
              border: 'none', borderRadius: 11, padding: 14, fontWeight: 700, fontSize: 13,
              cursor: enviando || ehExemplo ? 'not-allowed' : 'pointer' }}>
            {enviando ? 'Processando...' : 'Processar e separar documentos →'}
          </button>
        </div>
      </main>
    </div>
  )
}

const selectStyle = {
  width: '100%', background: '#fff', border: '1.5px solid #d6ccf2', borderRadius: 10,
  padding: '11px 13px', fontSize: 12.5, color: '#0f1020', fontFamily: 'Roboto',
}

function Label({ n, children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.purpleDark,
      textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7,
      display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: COLORS.blue,
        color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center' }}>{n}</span>{children}
    </div>
  )
}
