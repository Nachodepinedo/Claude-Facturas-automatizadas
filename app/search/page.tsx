'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchLoading from '@/components/SearchLoading'

interface SearchResult {
  id: string
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  _mailbox?: string
  attachments?: Array<{
    id: string
    filename: string
    mimeType: string
    size: number
  }>
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [months, setMonths] = useState(3) // Por defecto 3 meses
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState('')
  const [progress, setProgress] = useState(0)
  const [totalMailboxes, setTotalMailboxes] = useState(535)
  const router = useRouter()

  useEffect(() => {
    // Verificar si está autenticado
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (!token) {
      router.push('/')
    } else {
      setUser(savedUser || '')
    }
  }, [router])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResults([])
    setProgress(0)

    try {
      const token = localStorage.getItem('token')

      // Usar fetch regular para SSE
      const res = await fetch('/api/search-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, months }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || 'Error en la búsqueda')
        setLoading(false)
        return
      }

      // Leer el stream de respuesta
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        setError('Error al conectar con el servidor')
        setLoading(false)
        return
      }

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'progress') {
              setProgress(data.processed)
              setTotalMailboxes(data.total)
            } else if (data.type === 'complete') {
              setResults(data.results || [])
              if (data.results?.length === 0) {
                setError('No se encontraron resultados')
              }
            } else if (data.type === 'error') {
              setError(data.error)
            }
          }
        }
      }
    } catch (err) {
      console.error('Error en búsqueda:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (emailId: string, attachmentId: string, filename: string, mailbox?: string) => {
    try {
      const token = localStorage.getItem('token')
      const mailboxParam = mailbox ? `&mailbox=${encodeURIComponent(mailbox)}` : ''
      const res = await fetch(
        `/api/download?emailId=${emailId}&attachmentId=${attachmentId}&filename=${encodeURIComponent(filename)}${mailboxParam}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Error al descargar el archivo')
      }
    } catch (err) {
      alert('Error al descargar el archivo')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <>
      {loading && <SearchLoading progress={progress} total={totalMailboxes} estimatedTime={15} />}
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔍 Buscador de Facturas</h1>
        <div style={styles.userInfo}>
          <span style={styles.userName}>👤 {user}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Salir
          </button>
        </div>
      </div>

      <div style={styles.searchContainer}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por ID, empresa, pedido, monto..."
            style={styles.searchInput}
          />
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            style={styles.monthsSelect}
          >
            <option value={1}>Último mes</option>
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Último año</option>
            <option value={24}>Últimos 2 años</option>
            <option value={0}>Todo (sin límite)</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.searchButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '🔄 Buscando...' : '🔍 Buscar'}
          </button>
        </form>

        <p style={styles.hint}>
          💡 Busca por: nombre de empresa (Decathlon), número de pedido (ES51...), monto (€500), o cualquier texto
        </p>
      </div>

      {error && !loading && (
        <div style={styles.error}>{error}</div>
      )}

      {results.length > 0 && (
        <div style={styles.resultsContainer}>
          <h2 style={styles.resultsTitle}>
            Resultados ({results.length})
          </h2>

          {results.map((result) => (
            <div key={result.id} style={styles.resultCard}>
              <div style={styles.resultHeader}>
                <h3 style={styles.resultSubject}>📧 {result.subject}</h3>
                <span style={styles.resultDate}>{result.date}</span>
              </div>

              <div style={styles.resultInfo}>
                <p><strong>De:</strong> {result.from}</p>
                <p><strong>Para:</strong> {result.to}</p>
              </div>

              {result.snippet && (
                <p style={styles.resultSnippet}>{result.snippet}</p>
              )}

              {result.attachments && result.attachments.length > 0 && (
                <div style={styles.attachmentsContainer}>
                  <p style={styles.attachmentsTitle}>📎 Adjuntos:</p>
                  {result.attachments.map((attachment) => (
                    <div key={attachment.id} style={styles.attachment}>
                      <span style={styles.attachmentName}>
                        📄 {attachment.filename}
                      </span>
                      <span style={styles.attachmentSize}>
                        ({formatFileSize(attachment.size)})
                      </span>
                      <button
                        onClick={() => handleDownload(result.id, attachment.id, attachment.filename, result._mailbox)}
                        style={styles.downloadBtn}
                      >
                        ⬇ Descargar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  userName: {
    fontSize: '14px',
    color: '#666',
  },
  logoutBtn: {
    padding: '8px 16px',
    background: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  searchContainer: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  searchForm: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  searchInput: {
    flex: 1,
    padding: '14px 18px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
  },
  monthsSelect: {
    padding: '14px 12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    cursor: 'pointer',
    background: 'white',
    minWidth: '160px',
  },
  searchButton: {
    padding: '14px 30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  hint: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  error: {
    background: '#fee',
    border: '1px solid #fcc',
    borderRadius: '8px',
    padding: '15px',
    color: '#c33',
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  resultsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'white',
    margin: 0,
  },
  resultCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '15px',
    gap: '15px',
  },
  resultSubject: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
    flex: 1,
  },
  resultDate: {
    fontSize: '13px',
    color: '#666',
    whiteSpace: 'nowrap' as const,
  },
  resultInfo: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
  },
  resultSnippet: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '15px',
    fontStyle: 'italic' as const,
  },
  attachmentsContainer: {
    marginTop: '15px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  attachmentsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '10px',
  },
  attachment: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    background: 'white',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  attachmentName: {
    flex: 1,
    fontSize: '14px',
    color: '#333',
  },
  attachmentSize: {
    fontSize: '13px',
    color: '#666',
  },
  downloadBtn: {
    padding: '6px 14px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
}
