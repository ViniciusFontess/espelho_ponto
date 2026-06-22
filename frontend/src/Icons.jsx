// Ícones SVG estilo linha (sem emojis), herdam cor via prop `color`.
const base = (size) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
})

export function FileText({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)} stroke={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

export function Sparkles({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)} stroke={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3l1.8 4.8L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.7L12 3z" />
      <path d="M19 14l.7 1.9 1.8.6-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.6L19 14z" />
    </svg>
  )
}

export function Upload({ size = 26, color = 'currentColor' }) {
  return (
    <svg {...base(size)} stroke={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 9 12 4 17 9" />
      <line x1="12" y1="4" x2="12" y2="16" />
    </svg>
  )
}

export function Download({ size = 16, color = 'currentColor' }) {
  return (
    <svg {...base(size)} stroke={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function Folder({ size = 16, color = 'currentColor' }) {
  return (
    <svg {...base(size)} stroke={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  )
}

export function ArrowRight({ size = 16, color = 'currentColor' }) {
  return (
    <svg {...base(size)} stroke={color} xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14 6 20 12 14 18" />
    </svg>
  )
}

export function Check({ size = 16, color = 'currentColor' }) {
  return (
    <svg {...base(size)} stroke={color} xmlns="http://www.w3.org/2000/svg">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function ShieldCheck({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)} stroke={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <polyline points="9 12 11.5 14.5 16 9.5" />
    </svg>
  )
}
