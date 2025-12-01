import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

// Caché para la lista de usuarios del dominio (válido por 1 hora)
let domainUsersCache: { emails: string[]; timestamp: number } | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hora en milisegundos

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
      'https://www.googleapis.com/auth/admin.directory.user.readonly', // Nuevo scope para Directory API
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

// Función para obtener cliente de Directory API
function getDirectoryClient() {
  let credentials: any

  if (process.env.GMAIL_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GMAIL_SERVICE_ACCOUNT_JSON)
  } else if (process.env.GMAIL_CREDENTIALS_PATH) {
    const credentialsPath = path.join(process.cwd(), process.env.GMAIL_CREDENTIALS_PATH)
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'))
  } else {
    throw new Error('Gmail credentials not configured')
  }

  // Necesitamos un admin del dominio para usar Directory API
  const adminEmail = process.env.GMAIL_ADMIN_EMAIL
  if (!adminEmail) {
    throw new Error('GMAIL_ADMIN_EMAIL no está configurado. Necesario para listar usuarios del dominio.')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
    ],
    clientOptions: {
      subject: adminEmail, // El admin que ejecutará la consulta
    },
  })

  return google.admin({ version: 'directory_v1', auth })
}

const groupMembersCache: { [groupEmail: string]: { members: string[]; timestamp: number } } = {}

export async function getGroupMembers(groupEmail: string): Promise<string[]> {
  const cached = groupMembersCache[groupEmail]
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cache for group', groupEmail)
    return cached.members
  }

  console.log('Getting members for group', groupEmail)

  try {
    const admin = getDirectoryClient()
    const allMembers: string[] = []
    let pageToken: string | undefined

    do {
      const response = await admin.members.list({
        groupKey: groupEmail,
        maxResults: 200,
        pageToken,
      })

      const members = response.data.members || []

      for (const member of members) {
        if (member.email) {
          allMembers.push(member.email)
        }
      }

      pageToken = response.data.nextPageToken || undefined
    } while (pageToken)

    console.log('Found', allMembers.length, 'members in group', groupEmail)

    groupMembersCache[groupEmail] = {
      members: allMembers,
      timestamp: Date.now(),
    }

    return allMembers
  } catch (error) {
    console.error('Error getting group members', groupEmail, error)
    throw new Error('Could not get members for group. Check Directory API permissions.')
  }
}
// Función para obtener todos los usuarios del dominio
async function getAllDomainUsers(): Promise<string[]> {
  // Verificar caché
  if (domainUsersCache && Date.now() - domainUsersCache.timestamp < CACHE_DURATION) {
    console.log('📦 Usando caché de usuarios del dominio')
    return domainUsersCache.emails
  }

  console.log('🔍 Obteniendo lista de usuarios del dominio...')
  
  const domain = process.env.GMAIL_DOMAIN
  if (!domain) {
    throw new Error('GMAIL_DOMAIN no está configurado en las variables de entorno')
  }

  try {
    const admin = getDirectoryClient()
    const allUsers: string[] = []
    let pageToken: string | undefined

    // Paginar resultados (máximo 500 por página)
    do {
      const response = await admin.users.list({
        domain,
        maxResults: 500,
        pageToken,
      })

      const users = response.data.users || []
      
      // Extraer emails primarios de usuarios activos
      for (const user of users) {
        if (user.primaryEmail && !user.suspended) {
          allUsers.push(user.primaryEmail)
        }
      }

      pageToken = response.data.nextPageToken || undefined
    } while (pageToken)

    console.log(`✅ Encontrados ${allUsers.length} usuarios activos en ${domain}`)

    // Actualizar caché
    domainUsersCache = {
      emails: allUsers,
      timestamp: Date.now(),
    }

    return allUsers
  } catch (error) {
    console.error('❌ Error al obtener usuarios del dominio:', error)
    throw new Error('No se pudo obtener la lista de usuarios del dominio. Verifica que Domain-Wide Delegation esté configurado.')
  }
}

// Helper para buscar en multiples buzones
// groupEmail: si se pasa, obtiene los miembros del grupo y busca en sus buzones
export async function searchInAllMailboxes(
  query: string,
  maxResults = 50,
  onProgress?: (processed: number, total: number) => void,
  groupEmail?: string
) {
  let mailboxes: string[]

  // Si se especifica un grupo, obtener sus miembros y buscar en sus buzones
  if (groupEmail) {
    console.log('Searching in group members:', groupEmail)
    mailboxes = await getGroupMembers(groupEmail)
  } else {
    const mailboxesEnv = process.env.GMAIL_MAILBOXES

    if (mailboxesEnv && mailboxesEnv.trim()) {
      console.log('Using specific mailboxes list')
      mailboxes = mailboxesEnv.split(',').map(email => email.trim())
    } else {
      console.log('Searching in all domain mailboxes')
      mailboxes = await getAllDomainUsers()
    }
  }

  console.log('Searching in', mailboxes.length, 'mailboxes...')

  const allResults: any[] = []
  const resultsPerMailbox = Math.max(1, Math.ceil(maxResults / mailboxes.length))

  const BATCH_SIZE = 20

  for (let i = 0; i < mailboxes.length; i += BATCH_SIZE) {
    const batch = mailboxes.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (mailbox) => {
        try {
          const gmail = getGmailClient(mailbox)

          const response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: resultsPerMailbox,
          })

          if (response.data.messages) {
            const messagesWithMailbox = response.data.messages.map((msg) => ({
              ...msg,
              _mailbox: mailbox,
              internalDate: parseInt(msg.internalDate || '0'),
            }))
            allResults.push(...messagesWithMailbox)
          }
        } catch (error) {
          console.error('Error searching in', mailbox, (error as Error).message)
        }
      })
    )

    if (onProgress) {
      const processed = Math.min(i + BATCH_SIZE, mailboxes.length)
      onProgress(processed, mailboxes.length)
    }
  }

  console.log('Found', allResults.length, 'results total')
  allResults.sort((a, b) => b.internalDate - a.internalDate)

  return allResults.slice(0, maxResults)
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
