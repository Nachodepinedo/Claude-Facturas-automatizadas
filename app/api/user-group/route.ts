import { NextRequest, NextResponse } from 'next/server'
import { getGroupNameForUser } from '@/lib/user-groups'

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

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userEmail = extractEmailFromToken(auth)
    if (!userEmail) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const groupName = getGroupNameForUser(userEmail)
    
    return NextResponse.json({
      email: userEmail,
      groupName: groupName
    })
  } catch (error: any) {
    console.error('Error getting user group:', error)
    return NextResponse.json(
      { error: 'Error obteniendo grupo del usuario' },
      { status: 500 }
    )
  }
}
