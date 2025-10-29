import { NextRequest, NextResponse } from 'next/server'
import { searchInAllMailboxes, getMessageDetails } from '@/lib/gmail'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { query, months = 3 } = await request.json()

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query demasiado corta' },
        { status: 400 }
      )
    }

    // Calcular fecha de inicio según el filtro de meses
    let dateFilter = ''
    if (months > 0) {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)
      const year = startDate.getFullYear()
      const month = String(startDate.getMonth() + 1).padStart(2, '0')
      const day = String(startDate.getDate()).padStart(2, '0')
      dateFilter = ` after:${year}/${month}/${day}`
    }

    // Construir query de Gmail con filtro de fecha
    const gmailQuery = `has:attachment (factura OR invoice OR pedido OR albaran OR albarán) ${query}${dateFilter}`

    console.log('🔍 Buscando en Gmail:', gmailQuery)

    // Buscar en todos los buzones
    const messages = await searchInAllMailboxes(gmailQuery, 50)

    console.log(`📧 Encontrados ${messages.length} correos`)

    // Obtener detalles de cada mensaje
    const detailedResults = await Promise.all(
      messages.map(async (msg: any) => {
        try {
          const detail = await getMessageDetails(msg.id!, msg._mailbox)

          const headers = detail.payload?.headers || []
          const getHeader = (name: string) =>
            headers.find((h: any) => h.name === name)?.value || ''

          // Extraer adjuntos - manejo de diferentes estructuras
          let attachments: any[] = []

          // Función recursiva para encontrar adjuntos en parts anidados
          const extractAttachments = (parts: any[]): any[] => {
            let found: any[] = []
            for (const part of parts || []) {
              if (part.filename && part.body?.attachmentId) {
                found.push({
                  id: part.body.attachmentId,
                  filename: part.filename,
                  mimeType: part.mimeType || 'application/octet-stream',
                  size: part.body.size || 0,
                })
              }
              // Buscar en parts anidados
              if (part.parts) {
                found = found.concat(extractAttachments(part.parts))
              }
            }
            return found
          }

          attachments = extractAttachments(detail.payload?.parts || [])

          return {
            id: msg.id!,
            subject: getHeader('Subject'),
            from: getHeader('From'),
            to: getHeader('To'),
            date: getHeader('Date'),
            snippet: detail.snippet || '',
            attachments,
            _mailbox: msg._mailbox, // Guardamos de qué buzón vino
          }
        } catch (error) {
          console.error(`❌ Error obteniendo detalles de ${msg.id}:`, error)
          return null
        }
      })
    )

    // Filtrar resultados nulos
    const validResults = detailedResults.filter((r) => r !== null)

    console.log(`✅ Devolviendo ${validResults.length} resultados válidos`)

    return NextResponse.json({
      success: true,
      results: validResults,
      total: validResults.length,
    })
  } catch (error: any) {
    console.error('❌ Error en búsqueda:', error)
    return NextResponse.json(
      {
        error: 'Error en la búsqueda: ' + (error.message || 'Error desconocido'),
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
