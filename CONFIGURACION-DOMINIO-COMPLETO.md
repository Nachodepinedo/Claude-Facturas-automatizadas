# 🌐 Configuración para Acceso a TODO el Dominio

Esta guía explica cómo configurar la aplicación para que automáticamente busque en **TODOS** los buzones de `@brooklynfitboxing.com`.

## 📋 Variables de Entorno Necesarias

Tu archivo `.env.local` debe tener estas variables:

```env
# Autenticación básica
AUTH_USER=tu-email@brooklynfitboxing.com
AUTH_PASSWORD=tu-contraseña-segura
JWT_SECRET=algun-secreto-muy-seguro-random

# Gmail API - Service Account
GMAIL_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"facturas-476109",...todo el JSON...}

# Dominio y Admin (NUEVAS)
GMAIL_DOMAIN=brooklynfitboxing.com
GMAIL_ADMIN_EMAIL=admin@brooklynfitboxing.com

# OPCIONAL: Si quieres limitar a ciertos buzones, descomenta esta línea
# GMAIL_MAILBOXES=contabilidad@brooklynfitboxing.com,facturas@brooklynfitboxing.com
```

## 🔑 Explicación de Variables

### `GMAIL_DOMAIN` (requerida)
El dominio de Google Workspace donde buscar usuarios.
- **Ejemplo:** `brooklynfitboxing.com`

### `GMAIL_ADMIN_EMAIL` (requerida)
Email de un usuario con permisos de administrador del dominio. Este usuario se usa para ejecutar consultas a la Directory API.
- **Ejemplo:** `admin@brooklynfitboxing.com`
- **Importante:** Debe ser un Super Admin o tener permisos de "User Management"

### `GMAIL_MAILBOXES` (opcional)
Si está configurada: busca solo en esos buzones específicos (más rápido).
Si NO está configurada o está vacía: busca automáticamente en TODOS los buzones del dominio.

## ⚙️ Cómo Funciona

1. **Primera búsqueda:**
   - La app usa Directory API para obtener todos los usuarios activos de `@brooklynfitboxing.com`
   - Los guarda en caché por 1 hora
   - Busca en todos esos buzones en paralelo (grupos de 5 para no saturar la API)

2. **Búsquedas posteriores (durante 1 hora):**
   - Usa la lista cacheada de usuarios (más rápido)
   - No consulta Directory API de nuevo

3. **Después de 1 hora:**
   - El caché expira
   - Vuelve a consultar Directory API para actualizar la lista

## 🔐 Permisos Necesarios

### En Google Cloud Console

Tu compañera admin debe asegurarse de que el Service Account tenga este scope adicional:

```
https://www.googleapis.com/auth/admin.directory.user.readonly
```

**Cómo verificarlo:**
1. Google Cloud Console → IAM & Admin → Service Accounts
2. Clic en el Service Account `buscador-facturas-brooklyn@...`
3. Pestaña "Domain-Wide Delegation"
4. Verificar que los scopes incluyan:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/admin.directory.user.readonly` ← **NUEVO**

### En Google Workspace Admin Console

1. Ve a: https://admin.google.com
2. Seguridad → Acceso y control de datos → Controles de API → Administrar delegación en todo el dominio
3. Busca el Client ID del Service Account
4. Editar → Agregar el nuevo scope:
   ```
   https://www.googleapis.com/auth/admin.directory.user.readonly
   ```

## 🧪 Probar la Configuración

### 1. Reiniciar servidor
```bash
# Detener el servidor actual (Ctrl+C)
npm run dev
```

### 2. Ver logs en la consola
Deberías ver algo como:
```
🔍 Obteniendo lista de usuarios del dominio...
✅ Encontrados 47 usuarios activos en brooklynfitboxing.com
🔎 Buscando en 47 buzones...
✅ Encontrados 15 resultados en total
```

### 3. Hacer una búsqueda
- Busca: `factura`
- Debería encontrar correos de TODOS los buzones del dominio

## 🚀 Optimizaciones Implementadas

✅ **Caché de 1 hora:** No consulta Directory API en cada búsqueda
✅ **Búsqueda paralela:** Busca en múltiples buzones simultáneamente
✅ **Manejo de errores:** Si un buzón falla, continúa con los demás
✅ **Filtrado automático:** Excluye usuarios suspendidos
✅ **Batching:** Procesa en grupos de 5 para respetar límites de API

## 🐛 Troubleshooting

### Error: "GMAIL_DOMAIN no está configurado"
- Agrega `GMAIL_DOMAIN=brooklynfitboxing.com` al `.env.local`
- Reinicia el servidor

### Error: "GMAIL_ADMIN_EMAIL no está configurado"
- Agrega `GMAIL_ADMIN_EMAIL=admin@brooklynfitboxing.com` al `.env.local`
- Verifica que ese usuario sea un Super Admin
- Reinicia el servidor

### Error: "No se pudo obtener la lista de usuarios del dominio"
- Verifica que Domain-Wide Delegation incluya el scope de Directory API
- Confirma que `GMAIL_ADMIN_EMAIL` sea un Super Admin
- Revisa los logs del servidor para más detalles

### La búsqueda es muy lenta
Si tienes muchos usuarios (50+), considera usar `GMAIL_MAILBOXES` para limitar a los buzones más relevantes:
```env
GMAIL_MAILBOXES=contabilidad@brooklynfitboxing.com,facturas@brooklynfitboxing.com,admin@brooklynfitboxing.com
```

## 📊 Rendimiento Esperado

| Usuarios del dominio | Tiempo primera búsqueda | Tiempo con caché |
|---------------------|-------------------------|------------------|
| 10-20 usuarios      | ~5-10 segundos         | ~3-5 segundos    |
| 20-50 usuarios      | ~10-20 segundos        | ~5-10 segundos   |
| 50+ usuarios        | ~20-40 segundos        | ~10-20 segundos  |

**Recomendación:** Si tienes más de 50 usuarios, usa `GMAIL_MAILBOXES` para mejor rendimiento.

## ✅ Checklist de Configuración

- [ ] Variable `GMAIL_DOMAIN` agregada al `.env.local`
- [ ] Variable `GMAIL_ADMIN_EMAIL` agregada al `.env.local`
- [ ] Scope de Directory API agregado en Google Cloud Console
- [ ] Scope de Directory API agregado en Workspace Admin Console
- [ ] Servidor reiniciado
- [ ] Búsqueda de prueba exitosa
- [ ] Logs muestran cantidad de usuarios encontrados

## 🎉 ¡Listo!

Ahora la aplicación buscará automáticamente en todos los buzones de `@brooklynfitboxing.com` sin necesidad de especificarlos manualmente.
