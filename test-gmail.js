// Script de prueba para verificar conexión con Gmail
require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')

async function testGmail() {
  try {
    console.log('🔧 Configurando credenciales...')

    // Leer credenciales
    const credentials = JSON.parse(require('fs').readFileSync('./gmail-credentials.json', 'utf-8'))

    console.log('✅ Credenciales leídas')
    console.log('📧 Service Account Email:', credentials.client_email)

    // Probar con el primer buzón
    const mailboxes = process.env.GMAIL_MAILBOXES.split(',')
    const testMailbox = mailboxes[0].trim()

    console.log(`\n🔍 Probando acceso a: ${testMailbox}`)

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
      clientOptions: {
        subject: testMailbox,
      },
    })

    const gmail = google.gmail({ version: 'v1', auth })

    // Búsqueda simple: cualquier correo con adjunto
    console.log('\n📨 Buscando correos con adjuntos...')
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'has:attachment',
      maxResults: 5,
    })

    if (response.data.messages && response.data.messages.length > 0) {
      console.log(`✅ Encontrados ${response.data.messages.length} correos con adjuntos`)

      // Obtener detalles del primer correo
      const firstMsg = response.data.messages[0]
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: firstMsg.id,
        format: 'full',
      })

      const headers = detail.data.payload.headers
      const getHeader = (name) => headers.find(h => h.name === name)?.value || ''

      console.log('\n📧 Primer correo encontrado:')
      console.log('  De:', getHeader('From'))
      console.log('  Asunto:', getHeader('Subject'))
      console.log('  Fecha:', getHeader('Date'))

    } else {
      console.log('⚠️ No se encontraron correos con adjuntos en este buzón')
    }

    // Probar búsqueda con filtros de factura
    console.log('\n🔍 Buscando con filtros de factura...')
    const response2 = await gmail.users.messages.list({
      userId: 'me',
      q: 'has:attachment (factura OR invoice OR pedido OR albaran)',
      maxResults: 5,
    })

    if (response2.data.messages && response2.data.messages.length > 0) {
      console.log(`✅ Encontrados ${response2.data.messages.length} correos con facturas`)
    } else {
      console.log('⚠️ No se encontraron correos con facturas en este buzón')
      console.log('   Esto es normal si no hay correos con estas palabras clave')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.code) {
      console.error('   Código de error:', error.code)
    }
    if (error.errors) {
      console.error('   Detalles:', error.errors)
    }
  }
}

testGmail()
