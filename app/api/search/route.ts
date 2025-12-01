import { NextRequest, NextResponse } from 'next/server'
import { getGroupForUser, getGroupNameForUser } from '@/lib/user-groups'
import { searchInAllMailboxes, getMessageDetails } from '@/lib/gmail'


function buildSmartQuery(userQuery: string, dateFilter: string): string {
  const query = userQuery.trim()

  const moneyPattern = /[€$]?\s*(\d+(?:[.,]\d+)?)\s*[€$]?/
  const hasMoneySearch = moneyPattern.test(query)

  const orderIdPattern = /\b[A-Z0-9]{8,}(?:-[A-Z0-9]+)*\b/i
  const hasOrderId = orderIdPattern.test(query)

  const invoicePattern = /\b(?:FA|FC|FV|INV|F)?[\s-]?\d{4,}[\s-]?\d*\b/i
  const hasInvoiceNumber = invoicePattern.test(query)

  const invoiceKeywords = [
    'factura', 'invoice', 'pedido', 'order', 'albaran', 'albarán',
    'compra', 'purchase', 'pago', 'payment', 'recibo', 'receipt',
    'proforma', 'presupuesto', 'quote', 'orden', 'delivery', 'nota'
  ]

  if (hasOrderId || hasInvoiceNumber) {
    console.log('🎯 Búsqueda por ID/Número - Query amplia')
    return `has:attachment (${query})${dateFilter}`
  }

  if (hasMoneySearch) {
    console.log('💰 Búsqueda por monto')
    const moneyMatch = query.match(moneyPattern)
    if (moneyMatch) {
      const firstSix = invoiceKeywords.slice(0, 6).join(' OR ')
      return `has:attachment (${moneyMatch[0]} OR ${moneyMatch[1]}) (${firstSix})${dateFilter}`
    }
  }

  console.log('🏢 Búsqueda inteligente con variaciones')
  
  // Generar variaciones de la búsqueda
  const variations = []
  
  // 1. Frase exacta como la escribió el usuario
  variations.push(`"${query}"`)
  
  // 2. Frase en mayúsculas
  variations.push(`"${query.toUpperCase()}"`)
  
  // 3. Frase en minúsculas
  variations.push(`"${query.toLowerCase()}"`)
  
  // 4. Primera letra de cada palabra en mayúscula
  const titleCase = query.split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  variations.push(`"${titleCase}"`)
  
  // 5. Sin espacios (OpenAI)
  const noSpaces = query.replace(/\s+/g, '')
  if (noSpaces !== query) {
    variations.push(`"${noSpaces}"`)
    variations.push(`"${noSpaces.toUpperCase()}"`)
    variations.push(`"${noSpaces.toLowerCase()}"`)
  }
  
  
  // Eliminar duplicados
  const uniqueVariations = [...new Set(variations)]
  
  // Construir query con OR
  const variationsQuery = uniqueVariations.join(' OR ')
  
  console.log(`📝 Variaciones generadas: ${uniqueVariations.length}`)
  
  return `has:attachment (${variationsQuery})${dateFilter}`
}
// Función para extraer email del token
function extractEmailFromToken(auth: string): string | null {
  try {
    const token = auth.replace('Bearer ', '')
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const email = decoded.split(':')[0]
    return email
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
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

    let dateFilter = ''
    if (months > 0) {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)
      const year = startDate.getFullYear()
      const month = String(startDate.getMonth() + 1).padStart(2, '0')
      const day = String(startDate.getDate()).padStart(2, '0')
      dateFilter = ` after:${year}/${month}/${day}`
    }

    const gmailQuery = buildSmartQuery(query, dateFilter)

    console.log('🔍 Query original:', query)
    console.log('🔍 Buscando en Gmail:', gmailQuery)

    // Obtener email del usuario del token
    const userEmail = extractEmailFromToken(auth)
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Obtener grupo asignado al usuario
    const groupEmail = getGroupForUser(userEmail)
    const groupName = getGroupNameForUser(userEmail)
    
    if (!groupEmail) {
      return NextResponse.json(
        { error: 'Usuario no tiene grupo asignado' },
        { status: 403 }
      )
    }

    console.log(`👤 Usuario: ${userEmail}`)
    console.log(`📁 Grupo asignado: ${groupName} (${groupEmail})`)

    // Buscar solo en el grupo del usuario
    const messages = await searchInAllMailboxes(gmailQuery, 50, undefined, groupEmail)

    console.log(`📧 Encontrados ${messages.length} correos`)

    const detailedResults = await Promise.all(
      messages.map(async (msg: any) => {
        try {
          const detail = await getMessageDetails(msg.id!, msg._mailbox)

          const headers = detail.payload?.headers || []
          const getHeader = (name: string) =>
            headers.find((h: any) => h.name === name)?.value || ''

          let attachments: any[] = []

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

    const validResults = detailedResults.filter((r) => r !== null)

    // Filtrar por contenido visible para evitar falsos positivos
    const contentFilteredResults = validResults.filter((result) => {
      if (!result) return false

      // Generar las mismas variaciones que en buildSmartQuery
      const searchVariations = [
        query,
        query.toUpperCase(),
        query.toLowerCase(),
      ]

      // Title case
      const titleCase = query.split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      searchVariations.push(titleCase)

      // Sin espacios
      const noSpaces = query.replace(/\s+/g, '')
      if (noSpaces !== query) {
        searchVariations.push(noSpaces)
        searchVariations.push(noSpaces.toUpperCase())
        searchVariations.push(noSpaces.toLowerCase())
      }

      // Crear texto buscable con todos los campos visibles
      const searchableText = [
        result.subject || '',
        result.from || '',
        result.to || '',
        result.snippet || '',
        result.attachments?.map(a => a.filename).join(' ') || ''
      ].join(' ').toLowerCase()

      // Verificar si alguna variación aparece en el contenido visible
      return searchVariations.some(variation =>
        searchableText.includes(variation.toLowerCase())
      )
    })

    console.log(`✅ Filtrados ${contentFilteredResults.length} resultados con contenido válido (de ${validResults.length} originales)`)

    return NextResponse.json({
      success: true,
      results: contentFilteredResults,
      total: contentFilteredResults.length,
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
