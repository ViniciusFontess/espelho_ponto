import { useState } from 'react'
import Landing from './Landing'
import UploadMolde from './UploadMolde'
import Results from './Results'

export default function App() {
  const [tela, setTela] = useState('landing')  // landing | upload | results
  const [jobId, setJobId] = useState(null)

  if (tela === 'upload')
    return <UploadMolde onBack={() => setTela('landing')}
             onDone={(id) => { setJobId(id); setTela('results') }} />
  if (tela === 'results')
    return <Results jobId={jobId} onReset={() => { setJobId(null); setTela('landing') }} />
  return <Landing onSelectMolde={() => setTela('upload')} />
}
