import { NextRequest } from 'next/server'
import { searchInAllMailboxes, getMessageDetails } from '@/lib/gmail'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { query, months = 3 } = await request.json()

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query demasiado corta' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Crear stream de respuesta
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Enviar progreso inicial
          const sendProgress = (processed: number, total: number) => {
            const data = JSON.stringify({
              type: 'progress',
              processed,
              total
            })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            console.log(`📊 Progreso SSE: ${processed}/${total}`)
          }

          // Buscar en todos los buzones con callback de progreso
          const messages = await searchInAllMailboxes(gmailQuery, 50, sendProgress)

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
                  _mailbox: msg._mailbox,
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

          // Enviar resultados finales
          const data = JSON.stringify({
            type: 'complete',
            results: validResults,
            total: validResults.length,
          })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))

          controller.close()
        } catch (error: any) {
          console.error('❌ Error en búsqueda:', error)
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Error desconocido',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('❌ Error en búsqueda:', error)
    return new Response(
      JSON.stringify({
        error: 'Error en la búsqueda: ' + (error.message || 'Error desconocido'),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
