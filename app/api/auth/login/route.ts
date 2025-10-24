import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Obtener lista de usuarios autorizados
    // Formato: email1:password1,email2:password2,email3:password3
    const authUsersEnv = process.env.AUTH_USERS
    
    if (!authUsersEnv) {
      return NextResponse.json(
        { error: 'Sistema de autenticación no configurado' },
        { status: 500 }
      )
    }

    // Parsear usuarios
    const authorizedUsers = authUsersEnv.split(',').map(userStr => {
      const [userEmail, userPassword] = userStr.trim().split(':')
      return { email: userEmail, password: userPassword }
    })

    // Validar credenciales
    const validUser = authorizedUsers.find(
      u => u.email === email && u.password === password
    )

    if (validUser) {
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
