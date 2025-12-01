'use client'

import TicTacToe from './TicTacToe'

interface SearchLoadingProps {
  progress?: number
  total?: number
  estimatedTime?: number
  groupName?: string | null
}

export default function SearchLoading({ progress = 0, total = 535, estimatedTime = 15, groupName = null }: SearchLoadingProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0
  const remainingTime = Math.max(0, Math.round(estimatedTime * (1 - progress / total)))

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            🔍 {groupName ? `Buscando en ${groupName}...` : 'Buscando en toda la empresa...'}
          </h2>
          <p style={styles.subtitle}>⏱️ Tiempo estimado: ~{remainingTime} segundos</p>
        </div>

        <div style={styles.progressSection}>
          <div style={styles.progressInfo}>
            <span style={styles.progressText}>
              📊 {progress} de {total} buzones revisados
            </span>
            <span style={styles.percentage}>{percentage}%</span>
          </div>

          <div style={styles.progressBarContainer}>
            <div
              style={{
                ...styles.progressBar,
                width: `${percentage}%`,
              }}
            />
          </div>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>🎮 Mientras esperas...</span>
        </div>

        <TicTacToe />

        <p style={styles.hint}>
          💡 Tip: También puedes buscar por número de pedido, monto o fecha
        </p>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '25px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '600' as const,
    color: '#333',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  progressSection: {
    marginBottom: '30px',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  progressText: {
    fontSize: '14px',
    color: '#666',
  },
  percentage: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#667eea',
  },
  progressBarContainer: {
    width: '100%',
    height: '12px',
    background: '#e0e0e0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease',
    borderRadius: '6px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '20px 0',
  },
  dividerText: {
    fontSize: '16px',
    color: '#888',
    background: 'white',
    padding: '0 15px',
  },
  hint: {
    marginTop: '20px',
    fontSize: '13px',
    color: '#888',
    textAlign: 'center' as const,
    margin: '20px 0 0 0',
  },
}
