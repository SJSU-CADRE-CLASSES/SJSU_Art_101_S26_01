import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [assets, setAssets] = useState([])
  const [status, setStatus] = useState('Loading...')

  async function loadAssets() {
    try {
      const response = await fetch('/api/assets')
      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()
      setAssets(data.assets)
      setStatus('')
    } catch {
      setStatus('Could not connect to API. Start the backend server.')
    }
  }

  useEffect(() => {
    loadAssets()
  }, [])

  async function handleUpload(event) {
    event.preventDefault()
    if (!file) {
      setStatus('Select a file first.')
      return
    }

    const formData = new FormData()
    formData.append('title', title)
    formData.append('asset', file)

    setStatus('Uploading...')
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Upload failed')
      setTitle('')
      setFile(null)
      event.currentTarget.reset()
      await loadAssets()
      setStatus('Upload complete.')
    } catch {
      setStatus('Upload failed. Is the backend running?')
    }
  }

  async function handleDelete(id) {
    try {
      const response = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      await loadAssets()
      setStatus('Asset removed.')
    } catch {
      setStatus('Delete failed.')
    }
  }

  return (
    <main className="layout">
      <section className="panel">
        <h1>Portfolio Prototype</h1>
        <p>
          Upload artwork and media to server storage while building your React
          portfolio.
        </p>

        <form className="upload-form" onSubmit={handleUpload}>
          <label>
            Asset title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Sunset painting"
            />
          </label>

          <label>
            Choose file
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <button type="submit">Upload asset</button>
        </form>

        {status && <p className="status">{status}</p>}
      </section>

      <section className="panel">
        <h2>Uploaded assets</h2>
        {!assets.length && <p>No assets yet.</p>}
        <ul className="asset-list">
          {assets.map((asset) => (
            <li key={asset.id}>
              <div>
                <strong>{asset.title}</strong>
                <p>{asset.originalName}</p>
              </div>
              <div className="actions">
                <a href={asset.url} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button type="button" onClick={() => handleDelete(asset.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
