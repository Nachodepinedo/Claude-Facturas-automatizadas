'use client'

import { useState, useEffect } from 'react'

type Player = 'X' | 'O' | null
type Board = Player[]

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [winner, setWinner] = useState<Player | 'empate' | null>(null)

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
    [0, 4, 8], [2, 4, 6] // Diagonales
  ]

  const checkWinner = (currentBoard: Board): Player | 'empate' | null => {
    for (const combo of winningCombinations) {
      const [a, b, c] = combo
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return currentBoard[a]
      }
    }
    if (currentBoard.every(cell => cell !== null)) {
      return 'empate'
    }
    return null
  }

  const makeAIMove = (currentBoard: Board) => {
    // IA simple: busca ganar, bloquear, o juega aleatorio
    const availableMoves = currentBoard
      .map((cell, index) => (cell === null ? index : null))
      .filter((index): index is number => index !== null)

    if (availableMoves.length === 0) return

    // Intentar ganar
    for (const move of availableMoves) {
      const testBoard = [...currentBoard]
      testBoard[move] = 'O'
      if (checkWinner(testBoard) === 'O') {
        return move
      }
    }

    // Bloquear al jugador
    for (const move of availableMoves) {
      const testBoard = [...currentBoard]
      testBoard[move] = 'X'
      if (checkWinner(testBoard) === 'X') {
        return move
      }
    }

    // Centro si está disponible
    if (availableMoves.includes(4)) return 4

    // Esquinas
    const corners = [0, 2, 6, 8].filter(i => availableMoves.includes(i))
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)]
    }

    // Cualquier movimiento disponible
    return availableMoves[Math.floor(Math.random() * availableMoves.length)]
  }

  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timer = setTimeout(() => {
        const aiMove = makeAIMove(board)
        if (aiMove !== undefined) {
          const newBoard = [...board]
          newBoard[aiMove] = 'O'
          setBoard(newBoard)
          const gameWinner = checkWinner(newBoard)
          if (gameWinner) {
            setWinner(gameWinner)
          } else {
            setIsPlayerTurn(true)
          }
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isPlayerTurn, board, winner])

  const handleClick = (index: number) => {
    if (board[index] || winner || !isPlayerTurn) return

    const newBoard = [...board]
    newBoard[index] = 'X'
    setBoard(newBoard)

    const gameWinner = checkWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
    } else {
      setIsPlayerTurn(false)
    }
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setIsPlayerTurn(true)
    setWinner(null)
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🎮 Tres en Raya</h3>
      <p style={styles.subtitle}>
        {winner
          ? winner === 'empate'
            ? '🤝 ¡Empate!'
            : winner === 'X'
            ? '🎉 ¡Ganaste!'
            : '🤖 La máquina ganó'
          : isPlayerTurn
          ? '🎯 Tu turno'
          : '🤔 Pensando...'}
      </p>

      <div style={styles.board}>
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            style={{
              ...styles.cell,
              cursor: cell || winner || !isPlayerTurn ? 'not-allowed' : 'pointer',
              background: cell ? '#f0f0f0' : 'white',
            }}
            disabled={!!cell || !!winner || !isPlayerTurn}
          >
            <span style={styles.cellText}>{cell || ''}</span>
          </button>
        ))}
      </div>

      {winner && (
        <button onClick={resetGame} style={styles.resetButton}>
          🔄 Jugar de nuevo
        </button>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#333',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#666',
    margin: '0 0 20px 0',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '20px',
  },
  cell: {
    width: '70px',
    height: '70px',
    border: '2px solid #667eea',
    borderRadius: '8px',
    background: 'white',
    fontSize: '32px',
    fontWeight: 'bold' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  cellText: {
    userSelect: 'none' as const,
  },
  resetButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  },
}
