import { NextRequest, NextResponse } from 'next/server'
import { downloadAttachment } from '@/lib/gmail'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    const attachmentId = searchParams.get('attachmentId')
    const filename = searchParams.get('filename')
    const mailbox = searchParams.get('mailbox')

    if (!emailId || !attachmentId || !filename) {
      return NextResponse.json(
        { error: 'Parámetros faltantes' },
        { status: 400 }
      )
    }

    // Si no se especifica mailbox, intentar con el primer buzón
    const targetMailbox = mailbox || 'ignacio.depinedo@brooklynfitboxing.com'

    console.log(`📥 Descargando adjunto ${filename} de ${emailId} (mailbox: ${targetMailbox})`)

    // Descargar adjunto usando el helper
    const data = await downloadAttachment(emailId, attachmentId, targetMailbox)

    console.log(`✅ Adjunto descargado: ${filename} (${data.length} bytes)`)

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': data.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('❌ Error en descarga:', error)
    return NextResponse.json(
      {
        error: 'Error al descargar: ' + (error.message || 'Error desconocido'),
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
