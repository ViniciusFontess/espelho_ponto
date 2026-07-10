import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Topbar, StatusFooter } from './Chrome'
import { Upload, ArrowRight, Check } from './Icons'
import MoldeExemplo from './MoldeExemplo'
import { rotulo, descricao } from './variaveis'
import { COLORS, FONT, GRAD, monoLabel } from './theme'

export default function UploadMolde({ onBack, onDone }) {
  const [moldes, setMoldes] = useState([])
  const [moldeId, setMoldeId] = useState('')
  const [selecionadas, setSelecionadas] = useState([])
  const [file, setFile] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [drag, setDrag] = useState(false)
  const [verExemplo, setVerExemplo] = useState(false)
  const [od, setOd] = useState({ configurado: false, pastas: [] })
  const [pastaDestino, setPastaDestino] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    fetch('/moldes').then(r => r.json()).then(ms => {
      setMoldes(ms)
      const primeiro = ms.find(m => m.status === 'ativo') || ms[0]
      if (primeiro) { setMoldeId(primeiro.id); setSelecionadas(primeiro.variaveis) }
    })
    fetch('/onedrive/config').then(r => r.json()).then(c => {
      setOd(c)
      if (c.pastas?.length) setPastaDestino(c.pastas[0])
    }).catch(() => {})
  }, [])

  const molde = moldes.find(m => m.id === moldeId)
  const ehExemplo = molde?.status === 'exemplo'

  const trocarMolde = (id) => {
    setMoldeId(id)
    const m = moldes.find(x => x.id === id)
    setSelecionadas(m ? m.variaveis : [])
    setErro('')
  }
  const toggleVar = (v) => setSelecionadas(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])

  const pickFile = (f) => { if (f && f.name.endsWith('.pdf')) { setFile(f); setErro('') } }

  const processar = async () => {
    if (!file) { setErro('Selecione um arquivo PDF para continuar.'); return }
    if (ehExemplo) { setErro('Este molde ainda está em desenvolvimento.'); return }
    setEnviando(true); setErro('')
    const form = new FormData()
    form.append('file', file)
    form.append('molde_id', moldeId)
    form.append('variaveis', JSON.stringify(selecionadas))
    if (od.configurado && pastaDestino) form.append('pasta', pastaDestino)
    try {
      const res = await fetch('/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error((await res.json()).error)
      const { job_id } = await res.json()
      onDone(job_id)
    } catch (e) { setErro(e.message); setEnviando(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <Topbar onBack={onBack} />

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '36px 24px 8px', width: '100%' }}>
        <div style={{ ...monoLabel, color: COLORS.blue, marginBottom: 10 }}>SEPARADOR COM MOLDE</div>
        <h2 style={{ fontSize: 26, color: COLORS.ink }}>Processar um documento</h2>
        <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 8, maxWidth: 600, lineHeight: 1.55 }}>
          Siga os três passos abaixo. A plataforma separa cada pessoa em uma pasta e entrega tudo num arquivo .zip.
        </p>

        {/* passo 01 — arquivo */}
        <Passo n="01" titulo="Selecione o arquivo PDF" dica="O documento mensal com todas as pessoas em um único PDF.">
          <div
            onClick={() => inputRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]) }}
            style={{ border: `1.5px dashed ${drag || file ? COLORS.blue : COLORS.line}`,
              background: drag ? COLORS.blueSoft : '#fff', padding: 30, textAlign: 'center', cursor: 'pointer',
              transition: 'background .15s, border-color .15s' }}>
            <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={e => pickFile(e.target.files[0])} />
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              {file ? <Check size={28} color={COLORS.emerald} /> : <Upload color={COLORS.blue} />}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.ink }}>
              {file ? file.name : 'Arraste o PDF aqui ou clique para selecionar'}
            </div>
            <div style={{ ...monoLabel, fontSize: 10, color: COLORS.muted, marginTop: 6 }}>
              {file ? `${(file.size / 1024).toFixed(0)} KB · PRONTO` : 'FORMATO ACEITO: .PDF'}
            </div>
          </div>
          <button onClick={() => setVerExemplo(true)} style={{ marginTop: 12, fontSize: 12.5, color: COLORS.blue,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Não sabe se é o PDF certo? Ver exemplo do molde <ArrowRight size={14} color={COLORS.blue} />
          </button>
        </Passo>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: `1px solid ${COLORS.line}`, borderTop: 'none' }}>
          {/* passo 02 — o que extrair */}
          <div style={{ padding: 24, borderRight: `1px solid ${COLORS.line}` }}>
            <PassoHead n="02" titulo="O que extrair" dica="O tipo de documento e as informações de cada pessoa." />
            <select value={moldeId} onChange={e => trocarMolde(e.target.value)} style={selectStyle}>
              {moldes.map(m => (
                <option key={m.id} value={m.id}>{m.nome}{m.status === 'exemplo' ? ' (exemplo)' : ''}</option>
              ))}
            </select>
            <button onClick={() => setVerExemplo(true)} style={{ ...monoLabel, fontSize: 10, color: COLORS.blue,
              background: 'none', border: 'none', cursor: 'pointer', marginTop: 9, padding: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              VER EXEMPLO DESTE MOLDE <ArrowRight size={13} color={COLORS.blue} />
            </button>

            <div style={{ ...monoLabel, fontSize: 9.5, color: COLORS.muted, margin: '18px 0 4px' }}>INFORMAÇÕES A EXTRAIR</div>
            <p style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 10 }}>Marque o que deve ser lido de cada pessoa.</p>
            <div style={{ border: `1px solid ${COLORS.line}` }}>
              {molde?.variaveis.map((v, i) => {
                const on = selecionadas.includes(v)
                return (
                  <button key={v} onClick={() => toggleVar(v)} style={{ width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', cursor: 'pointer',
                    background: on ? COLORS.blueSoft : '#fff', border: 'none',
                    borderTop: i ? `1px solid ${COLORS.line}` : 'none', fontFamily: FONT.sans }}>
                    <span style={{ width: 18, height: 18, flexShrink: 0, border: `1.5px solid ${on ? COLORS.blue : COLORS.line}`,
                      background: on ? COLORS.blue : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <Check size={12} color="#fff" />}
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{rotulo(v)}</span>
                      {descricao(v) && <span style={{ display: 'block', fontSize: 11, color: COLORS.muted, marginTop: 1 }}>{descricao(v)}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            {ehExemplo && <p style={{ fontSize: 11.5, color: COLORS.amber, marginTop: 10, fontWeight: 500 }}>
              Molde em desenvolvimento, seleção apenas demonstrativa.</p>}
          </div>

          {/* passo 03 — destino */}
          <div style={{ padding: 24 }}>
            <PassoHead n="03" titulo="Para onde vai cada pessoa" dica="Como a plataforma direciona cada colaborador para sua pasta funcional." />

            {od.configurado && (
              <div style={{ marginBottom: 16, padding: 14, border: `1.5px solid ${COLORS.blue}`, background: COLORS.blueSoft }}>
                <div style={{ ...monoLabel, fontSize: 9.5, color: COLORS.blue, marginBottom: 8 }}>PASTA DE DESTINO NO ONEDRIVE</div>
                <select value={pastaDestino} onChange={e => setPastaDestino(e.target.value)}
                  style={{ ...selectStyle, borderColor: COLORS.blue }}>
                  {od.pastas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <p style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 8 }}>
                  No relatório, o botão <strong>Confirmar envio para o OneDrive</strong> vai gravar nesta pasta.
                </p>
              </div>
            )}

            <select disabled style={{ ...selectStyle, opacity: .7 }}>
              <option>Organização: por pessoa e competência</option>
            </select>

            {/* caminho anotado, nível a nível */}
            <div style={{ border: `1px solid ${COLORS.line}`, marginTop: 14 }}>
              {[
                { ind: 0, path: '/Pasta Funcional/', cor: COLORS.blue, tipo: 'RAIZ',
                  desc: 'Diretório base no servidor do SEBRAE.' },
                { ind: 1, path: 'NOME_DA_PESSOA/', cor: COLORS.ink, tipo: 'PASTA',
                  desc: 'Uma pasta por colaborador. O nome é normalizado: sem acentos e com “_” no lugar de espaços.' },
                { ind: 2, path: 'MM_AAAA/', cor: COLORS.ink, tipo: 'SUBPASTA',
                  desc: 'Subpasta por competência (mês e ano de referência).' },
                { ind: 3, path: 'dados.pdf', cor: COLORS.inkSoft, tipo: 'ARQUIVO',
                  desc: 'Ficha legível da pessoa (nome, competência, campos e status de assinatura).' },
                { ind: 3, path: 'pagina.pdf', cor: COLORS.inkSoft, tipo: 'ARQUIVO',
                  desc: 'A página original do espelho daquela pessoa, recortada do PDF.' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px',
                  borderTop: i ? `1px solid ${COLORS.line}` : 'none', background: r.ind === 0 ? COLORS.blueSoft : '#fff' }}>
                  <div style={{ flexShrink: 0, paddingLeft: r.ind * 14, minWidth: 150 }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 11.5, color: r.cor, fontWeight: r.ind < 2 ? 700 : 400 }}>
                      {r.ind > 0 && <span style={{ color: COLORS.line }}>└─ </span>}{r.path}
                    </div>
                    <div style={{ ...monoLabel, fontSize: 8, color: COLORS.muted, marginTop: 3, paddingLeft: r.ind ? 16 : 0 }}>{r.tipo}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: COLORS.muted, lineHeight: 1.45, alignSelf: 'center' }}>{r.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, background: COLORS.bg, border: `1px solid ${COLORS.line}`, padding: '10px 12px' }}>
              <div style={{ ...monoLabel, fontSize: 8.5, color: COLORS.blue, marginBottom: 4 }}>EXEMPLO REAL</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 11, color: COLORS.inkSoft }}>
                /Pasta Funcional/<span style={{ color: COLORS.ink, fontWeight: 700 }}>ADILER_ALEX_MATIAS/</span><span style={{ color: COLORS.blue }}>01_2026/</span>
              </div>
            </div>

            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10 }}>
              No final, tudo é entregue em um <strong style={{ color: COLORS.ink }}>.zip</strong> com essa mesma estrutura, pronto para
              copiar para o servidor.
            </p>
          </div>
        </div>

        {/* erro + ação */}
        {erro && (
          <div style={{ marginTop: 16, background: COLORS.redSoft, border: `1px solid ${COLORS.red}`,
            color: COLORS.red, padding: '11px 14px', fontSize: 13, fontWeight: 500 }}>{erro}</div>
        )}
        <motion.button whileTap={{ scale: .995 }} onClick={processar} disabled={enviando || ehExemplo}
          style={{ marginTop: 18, width: '100%', background: ehExemplo ? '#c4c8d4' : GRAD.cta, color: '#fff',
            border: 'none', padding: 16, fontFamily: FONT.sans, fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: enviando || ehExemplo ? 'not-allowed' : 'pointer' }}>
          {enviando
            ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.5)', borderTopColor: '#fff',
                borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Processando…</>
            : <>Processar e separar documentos <ArrowRight color="#fff" /></>}
        </motion.button>
      </main>

      <div style={{ flex: 1 }} />
      <StatusFooter />

      {verExemplo && <MoldeExemplo molde={molde} onClose={() => setVerExemplo(false)} />}
    </div>
  )
}

const selectStyle = {
  width: '100%', background: '#fff', border: `1px solid ${COLORS.line}`, borderRadius: 0,
  padding: '11px 13px', fontSize: 13, color: COLORS.ink, fontFamily: FONT.sans,
}

// passo com moldura (passo 01, destacado)
function Passo({ n, titulo, dica, children }) {
  return (
    <div style={{ border: `1px solid ${COLORS.line}`, background: '#fff', padding: 24, marginTop: 26 }}>
      <PassoHead n={n} titulo={titulo} dica={dica} />
      {children}
    </div>
  )
}

function PassoHead({ n, titulo, dica }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...monoLabel, fontSize: 13, color: COLORS.blue, fontWeight: 700 }}>{n}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.ink }}>{titulo}</span>
      </div>
      {dica && <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, marginLeft: 33 }}>{dica}</p>}
    </div>
  )
}
