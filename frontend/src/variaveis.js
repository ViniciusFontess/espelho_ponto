// Rótulos amigáveis + descrições simples para as variáveis dos moldes.
// Traduz chaves técnicas (ex.: "matricula") em algo que um servidor entende.
export const VAR_INFO = {
  nome:        { label: 'Nome',              desc: 'Nome completo da pessoa' },
  matricula:   { label: 'Matrícula',         desc: 'Número de registro do funcionário' },
  cpf:         { label: 'CPF',               desc: 'Cadastro de pessoa física' },
  pis:         { label: 'PIS',               desc: 'Número do PIS/PASEP' },
  cargo:       { label: 'Cargo',             desc: 'Função exercida' },
  equipe:      { label: 'Equipe / Setor',    desc: 'Lotação da pessoa' },
  periodo:     { label: 'Competência',       desc: 'Mês e ano de referência' },
  competencia: { label: 'Competência',       desc: 'Mês e ano de referência' },
  dias:        { label: 'Registros de ponto', desc: 'Entradas e saídas do mês' },
  assinatura:  { label: 'Assinatura digital', desc: 'Confere se o documento foi assinado' },
  pagina:      { label: 'Página de origem',  desc: 'Página do PDF de cada pessoa' },
  periodo_aquisitivo: { label: 'Período aquisitivo', desc: 'Período que gerou o direito às férias' },
  periodo_gozo:       { label: 'Período de gozo',    desc: 'Datas das férias' },
  saldo:              { label: 'Saldo',              desc: 'Saldo de dias' },
}

export const rotulo = (v) => VAR_INFO[v]?.label || v
export const descricao = (v) => VAR_INFO[v]?.desc || ''
