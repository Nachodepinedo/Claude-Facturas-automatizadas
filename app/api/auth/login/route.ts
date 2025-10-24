import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Obtener credenciales del env
    const validEmail = process.env.AUTH_USER
    const validPassword = process.env.AUTH_PASSWORD

    // Validar credenciales
    if (email === validEmail && password === validPassword) {
      // Crear un token simple (en producción usar JWT real)
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64')

      return NextResponse.json({
        success: true,
        token,
        user: email.split('@')[0],
      })
    } else {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    )
  }
}
