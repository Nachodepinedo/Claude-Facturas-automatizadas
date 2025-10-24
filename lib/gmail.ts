import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

export function getGmailClient(userEmail?: string) {
  // Leer credenciales - soporta archivo local O variable de entorno
  let credentials: any

  if (process.env.GMAIL_SERVICE_ACCOUNT_JSON) {
    // Producción: usar variable de entorno
    credentials = JSON.parse(process.env.GMAIL_SERVICE_ACCOUNT_JSON)
  } else if (process.env.GMAIL_CREDENTIALS_PATH) {
    // Desarrollo: usar archivo local
    const credentialsPath = path.join(process.cwd(), process.env.GMAIL_CREDENTIALS_PATH)
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'))
  } else {
    throw new Error('Gmail credentials not configured')
  }

  // Configurar autenticación con Service Account
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    // Subject: el usuario que va a "suplantar" el Service Account
    ...(userEmail && {
      clientOptions: {
        subject: userEmail,
      },
    }),
  })

  return google.gmail({ version: 'v1', auth })
}

// Helper para buscar en múltiples buzones
export async function searchInAllMailboxes(query: string, maxResults = 50) {
  // Lista de buzones corporativos a buscar
  const mailboxes = [
    'ignacio.depinedo@brooklynfitboxing.com',
    'katerin.lopez@brooklynfitboxing.com',
    'yuderky.maldonado@brooklynfitboxing.com',
    'compras@brooklynfitboxing.com',
    'facturas@brooklynfitboxing.com',
    // Agregar más buzones según necesites
  ]

  const allResults: any[] = []
  const resultsPerMailbox = Math.ceil(maxResults / mailboxes.length)

  for (const mailbox of mailboxes) {
    try {
      const gmail = getGmailClient(mailbox)

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: resultsPerMailbox,
      })

      if (response.data.messages) {
        // Agregar info del buzón a cada mensaje
        const messagesWithMailbox = response.data.messages.map((msg) => ({
          ...msg,
          _mailbox: mailbox,
        }))
        allResults.push(...messagesWithMailbox)
      }
    } catch (error) {
      console.error(`Error buscando en ${mailbox}:`, error)
      // Continuar con el siguiente buzón
    }
  }

  return allResults
}

// Helper para obtener detalles de un mensaje
export async function getMessageDetails(messageId: string, mailbox: string) {
  try {
    const gmail = getGmailClient(mailbox)

    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    })

    return detail.data
  } catch (error) {
    console.error(`Error obteniendo mensaje ${messageId} de ${mailbox}:`, error)
    throw error
  }
}

// Helper para descargar adjunto
export async function downloadAttachment(
  messageId: string,
  attachmentId: string,
  mailbox: string
) {
  try {
    const gmail = getGmailClient(mailbox)

    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    })

    if (!attachment.data.data) {
      throw new Error('Adjunto no encontrado')
    }

    // Decodificar base64 (Gmail usa base64url)
    const data = Buffer.from(
      attachment.data.data.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    )

    return data
  } catch (error) {
    console.error(`Error descargando adjunto ${attachmentId}:`, error)
    throw error
  }
}
