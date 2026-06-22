// Sistema visual "precisão técnica / govtech" — quadrado (raio 0), azul vivo,
// hairlines, acentos em Roboto Mono. Claro, profissional, legível.
export const COLORS = {
  blue: '#3b5bfe',        // azul primário
  blueDark: '#2540e6',    // hover / gradiente
  blueSoft: '#eaeefe',    // tinta clara (fundos, chips)
  ink: '#0f1222',         // quase-preto (títulos)
  inkSoft: '#3a3f54',     // texto forte
  muted: '#6b7280',       // texto secundário
  line: '#e3e6ef',        // hairline / bordas
  bg: '#f4f6fc',          // fundo geral
  white: '#ffffff',
  // status
  emerald: '#0a8f5b', emeraldSoft: '#e1f5ec',
  amber: '#b8740a', amberSoft: '#fbf0db',
  red: '#d23541', redSoft: '#fbe7e8',
  // aliases (compat)
  purple: '#3b5bfe', purpleDark: '#2540e6', purpleLight: '#eaeefe',
  border: '#e3e6ef',
  emeraldLight: '#e1f5ec', amberLight: '#fbf0db', redLight: '#fbe7e8',
}

export const FONT = {
  sans: "'Roboto', system-ui, sans-serif",
  mono: "'Roboto Mono', ui-monospace, monospace",
}

export const GRAD = {
  cta: `linear-gradient(180deg, ${COLORS.blue}, ${COLORS.blueDark})`,
  header: '#ffffff',
  hero: '#ffffff',
}

// tudo quadrado
export const R = { card: '0px', el: '0px', tag: '0px' }

// rótulo técnico em mono (uppercase, espaçado)
export const monoLabel = {
  fontFamily: FONT.mono, fontSize: 11, fontWeight: 500,
  letterSpacing: '.14em', textTransform: 'uppercase',
}
