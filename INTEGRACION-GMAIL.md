# 🔗 Integración con Gmail API

Guía para conectar la aplicación con Gmail real una vez tengas el Service Account configurado.

## 📋 Pre-requisitos

✅ Tu compañera admin ya configuró el Service Account (siguió `guia-configuracion-gmail-workspace-mcp.md`)
✅ Tienes el archivo JSON con las credenciales
✅ Domain-Wide Delegation está activado

## 🚀 Pasos de Integración

### 1. Instalar Dependencia de Gmail API

```bash
cd buscador-facturas
npm install googleapis
```

### 2. Agregar Credenciales al `.env.local`

Opción A - Archivo JSON en la misma carpeta:

1. Copia el archivo JSON a: `buscador-facturas/gmail-credentials.json`
2. Edita `.env.local`:

```env
# Usuario y contraseña (ya configurado)
AUTH_USER=juderky.maldonado@brooklynfitboxing.com
AUTH_PASSWORD=JMaldonado1975

JWT_SECRET=tu-secreto-super-seguro-cambiame-en-produccion

# Gmail API - NUEVO
GMAIL_CREDENTIALS_PATH=./gmail-credentials.json
GMAIL_DOMAIN=brooklynfitboxing.com
```

Opción B - JSON inline (más seguro para producción):

```env
AUTH_USER=juderky.maldonado@brooklynfitboxing.com
AUTH_PASSWORD=JMaldonado1975

JWT_SECRET=tu-secreto-super-seguro-cambiame-en-produccion

# Gmail API - JSON completo en una línea
GMAIL_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
GMAIL_DOMAIN=brooklynfitboxing.com
```

### 3. Crear Helper de Gmail

Crea: `buscador-facturas/lib/gmail.ts`

```typescript
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

export function getGmailClient() {
  // Opción 1: Desde archivo
  if (process.env.GMAIL_CREDENTIALS_PATH) {
    const credentialsPath = path.join(process.cwd(), process.env.GMAIL_CREDENTIALS_PATH)
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'))

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
      // Importante: delegar al dominio
      clientOptions: {
        subject: `admin@${process.env.GMAIL_DOMAIN}`, // Usuario que actuará
      },
    })

    return google.gmail({ version: 'v1', auth })
  }

  // Opción 2: Desde variable de entorno
  if (process.env.GMAIL_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GMAIL_SERVICE_ACCOUNT_JSON)

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
      clientOptions: {
        subject: `admin@${process.env.GMAIL_DOMAIN}`,
      },
    })

    return google.gmail({ version: 'v1', auth })
  }

  throw new Error('Gmail credentials not configured')
}

// Helper para buscar en múltiples buzones
export async function searchInAllMailboxes(query: string, maxResults = 50) {
  const gmail = getGmailClient()

  // Lista de buzones corporativos a buscar
  const mailboxes = [
    'ignacio.depinedo@brooklynfitboxing.com',
    'katerin.lopez@brooklynfitboxing.com',
    'compras@brooklynfitboxing.com',
    // Agregar más según necesites
  ]

  const allResults = []

  for (const mailbox of mailboxes) {
    try {
      const response = await gmail.users.messages.list({
        userId: mailbox,
        q: query,
        maxResults: Math.floor(maxResults / mailboxes.length),
      })

      if (response.data.messages) {
        allResults.push(...response.data.messages)
      }
    } catch (error) {
      console.error(`Error buscando en ${mailbox}:`, error)
    }
  }

  return allResults
}
```

### 4. Actualizar API de Búsqueda

Reemplaza `app/api/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getGmailClient, searchInAllMailboxes } from '@/lib/gmail'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { query } = await request.json()

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query demasiado corta' },
        { status: 400 }
      )
    }

    // Construir query de Gmail
    const gmailQuery = `has:attachment (factura OR invoice OR pedido OR albaran) ${query}`

    // Buscar en todos los buzones
    const messages = await searchInAllMailboxes(gmailQuery, 50)

    // Obtener detalles de cada mensaje
    const gmail = getGmailClient()
    const detailedResults = await Promise.all(
      messages.map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me', // Cambiará según el buzón
            id: msg.id!,
            format: 'full',
          })

          const headers = detail.data.payload?.headers || []
          const getHeader = (name: string) =>
            headers.find((h) => h.name === name)?.value || ''

          // Extraer adjuntos
          const attachments = (detail.data.payload?.parts || [])
            .filter((part) => part.filename && part.body?.attachmentId)
            .map((part) => ({
              id: part.body!.attachmentId!,
              filename: part.filename!,
              mimeType: part.mimeType!,
              size: part.body!.size || 0,
            }))

          return {
            id: msg.id!,
            subject: getHeader('Subject'),
            from: getHeader('From'),
            to: getHeader('To'),
            date: getHeader('Date'),
            snippet: detail.data.snippet || '',
            attachments,
          }
        } catch (error) {
          console.error(`Error obteniendo detalles de ${msg.id}:`, error)
          return null
        }
      })
    )

    // Filtrar resultados nulos
    const validResults = detailedResults.filter((r) => r !== null)

    return NextResponse.json({
      success: true,
      results: validResults,
      total: validResults.length,
    })
  } catch (error) {
    console.error('Error en búsqueda:', error)
    return NextResponse.json(
      { error: 'Error en la búsqueda: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
```

### 5. Actualizar API de Descarga

Reemplaza `app/api/download/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getGmailClient } from '@/lib/gmail'

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    const attachmentId = searchParams.get('attachmentId')
    const filename = searchParams.get('filename')

    if (!emailId || !attachmentId || !filename) {
      return NextResponse.json(
        { error: 'Parámetros faltantes' },
        { status: 400 }
      )
    }

    const gmail = getGmailClient()

    // Descargar adjunto
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: emailId,
      id: attachmentId,
    })

    if (!attachment.data.data) {
      return NextResponse.json(
        { error: 'Adjunto no encontrado' },
        { status: 404 }
      )
    }

    // Decodificar base64
    const data = Buffer.from(
      attachment.data.data.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    )

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': data.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error en descarga:', error)
    return NextResponse.json(
      { error: 'Error al descargar: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
```

### 6. Actualizar `tsconfig.json` (si no está)

Asegúrate de que tienes el alias `@/`:

```json
{
  "compilerOptions": {
    // ... otras opciones
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## 🧪 Probar la Integración

### 1. Reiniciar el servidor

```bash
# Detener el servidor actual (Ctrl+C)
npm run dev
```

### 2. Verificar logs

Deberías ver en la consola:
- ✅ Sin errores de credenciales
- ✅ Gmail API conectada

### 3. Hacer una búsqueda de prueba

1. Login con: `juderky.maldonado@brooklynfitboxing.com` / `JMaldonado1975`
2. Buscar: `Decathlon`
3. Deberían aparecer correos REALES de tu empresa
4. Descargar un PDF y verificar que sea real

## 🐛 Troubleshooting

### Error: "credentials not configured"

- Verifica que `.env.local` tiene las variables correctas
- Reinicia el servidor después de cambiar `.env.local`

### Error: "unauthorized"

- Verifica que Domain-Wide Delegation está activado
- Confirma que los scopes en Admin Console coinciden:
  ```
  https://www.googleapis.com/auth/gmail.readonly
  https://www.googleapis.com/auth/gmail.send
  ```

### Error: "User not found"

- Verifica que `GMAIL_DOMAIN` es correcto
- Asegúrate de que los buzones existen

### No aparecen resultados

- Prueba con query más simple: solo "factura"
- Verifica que hay correos con adjuntos en los buzones
- Revisa los logs de la consola

## 🚀 Optimizaciones Futuras

### 1. Cachear resultados (5 minutos)

```typescript
// En search/route.ts
const cache = new Map()
const cacheKey = `search:${query}`

if (cache.has(cacheKey)) {
  const cached = cache.get(cacheKey)
  if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return NextResponse.json(cached.data)
  }
}

// ... búsqueda real ...

cache.set(cacheKey, { data: results, timestamp: Date.now() })
```

### 2. Paginación

```typescript
const page = parseInt(searchParams.get('page') || '1')
const perPage = 20

// ... búsqueda ...

return NextResponse.json({
  results: results.slice((page - 1) * perPage, page * perPage),
  total: results.length,
  page,
  perPage,
  totalPages: Math.ceil(results.length / perPage),
})
```

### 3. Búsqueda en background (para muchos buzones)

```typescript
import { Queue } from 'bull'

const searchQueue = new Queue('search')

// Procesar búsquedas en cola
searchQueue.process(async (job) => {
  const { query, mailboxes } = job.data
  // ... búsqueda ...
})
```

## 📝 Checklist Final

Antes de considerar la integración completa:

- [ ] Archivo JSON de credenciales obtenido
- [ ] Variables de entorno configuradas
- [ ] `googleapis` instalado
- [ ] `lib/gmail.ts` creado
- [ ] APIs actualizadas (search y download)
- [ ] Servidor reiniciado
- [ ] Búsqueda de prueba exitosa
- [ ] Descarga de PDF real funciona
- [ ] Búsqueda en múltiples buzones funciona

## 🎉 ¡Listo!

Una vez completados estos pasos, la aplicación estará 100% funcional buscando en todos los correos reales de la empresa.

**Tiempo estimado:** 30-45 minutos
