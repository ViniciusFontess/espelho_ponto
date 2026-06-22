import logoUrl from './sebrae.png'

// Logo oficial do SEBRAE (PNG transparente). `fill` é ignorado — a logo já
// vem na cor de marca; mantido na assinatura por compatibilidade.
export default function SebraeLogo({ height = 30 }) {
  return (
    <img src={logoUrl} alt="SEBRAE" style={{ display: 'block', height, width: 'auto' }} />
  )
}
