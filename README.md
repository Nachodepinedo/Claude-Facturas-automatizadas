# 🔍 Buscador de Facturas

Aplicación web para buscar y descargar facturas de correos corporativos.

## 🎯 Características

- ✅ Login seguro con usuario/contraseña
- ✅ Búsqueda inteligente de facturas
- ✅ Descarga de PDFs adjuntos
- ✅ Interfaz moderna y responsive
- ✅ Sin base de datos (búsqueda en tiempo real)

## 🚀 Inicio Rápido

### Credenciales de Acceso

- **Usuario:** `yuderky.maldonado@brooklynfitboxing.com`
- **Contraseña:** `JMaldonado1975`

### Ejecutar la Aplicación

```bash
# Instalar dependencias (solo primera vez)
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## 📖 Cómo Usar

### 1. Iniciar Sesión

1. Abre http://localhost:3000
2. Ingresa el usuario y contraseña
3. Haz clic en "Entrar"

### 2. Buscar Facturas

1. En la barra de búsqueda, escribe:
   - Nombre de empresa: `Decathlon`
   - Número de pedido: `ES51JYAU44AQ-A`
   - Cualquier texto relacionado

2. Haz clic en "🔍 Buscar" o presiona Enter

3. Los resultados aparecerán con:
   - Asunto del correo
   - Remitente y destinatario
   - Fecha
   - Lista de adjuntos

### 3. Descargar PDFs

1. En cada resultado, verás los adjuntos listados
2. Haz clic en "⬇ Descargar" junto al archivo que desees
3. El archivo se descargará automáticamente

## 🔧 Estado Actual

### ✅ Completado

- [x] Página de login
- [x] Autenticación con usuario/contraseña
- [x] Página de búsqueda con interfaz completa
- [x] API de búsqueda (con datos de prueba)
- [x] API de descarga de PDFs (con PDF de ejemplo)

### 🚧 Pendiente

- [ ] **Integración con Gmail API**
  - Necesita configuración del Service Account
  - Tu compañera admin debe seguir la guía: `guia-configuracion-gmail-workspace-mcp.md`
  - Una vez configurado, reemplazar el código mock con el código real

## 📁 Estructura del Proyecto

```
buscador-facturas/
├── app/
│   ├── page.tsx                    # Página de login
│   ├── search/
│   │   └── page.tsx                # Página de búsqueda
│   ├── api/
│   │   ├── auth/
│   │   │   └── login/route.ts      # API de autenticación
│   │   ├── search/route.ts         # API de búsqueda (mock)
│   │   └── download/route.ts       # API de descarga (mock)
│   ├── layout.tsx
│   └── globals.css
├── .env.local                       # Variables de entorno
├── package.json
├── tsconfig.json
└── next.config.js
```

## 🔐 Configuración

### Variables de Entorno (`.env.local`)

```env
# Credenciales actuales
AUTH_USER=juderky.maldonado@brooklynfitboxing.com
AUTH_PASSWORD=JMaldonado1975

# Para producción
JWT_SECRET=tu-secreto-super-seguro-cambiame-en-produccion

# Gmail API (cuando esté configurado)
# GMAIL_SERVICE_ACCOUNT_JSON=
# GMAIL_DOMAIN=brooklynfitboxing.com
```

## 🚀 Próximos Pasos

### Para Conectar con Gmail Real:

1. **Tu compañera administradora debe:**
   - Seguir la guía: `guia-configuracion-gmail-workspace-mcp.md`
   - Crear Service Account en Google Cloud
   - Configurar Domain-Wide Delegation
   - Entregar archivo JSON de credenciales

2. **Luego tú debes:**
   - Instalar googleapis: `npm install googleapis`
   - Agregar el JSON a `.env.local`
   - Descomentar el código real en:
     - `app/api/search/route.ts`
     - `app/api/download/route.ts`

3. **Listo!** La app buscará en todos los correos reales

## 📊 Datos de Prueba Actuales

La aplicación actualmente muestra 3 correos de ejemplo:

1. **Pedido ES51JYAU44AQ-A** (Decathlon)
   - Para: ignacio.depinedo@brooklynfitboxing.com
   - 2 adjuntos: factura.pdf, albaran.pdf

2. **Pedido ES51KKCHXWAQ-A** (Decathlon)
   - Para: katerin.lopez@brooklynfitboxing.com
   - 1 adjunto: factura.pdf

3. **Pedido ES5273YU4XBC-A** (Decathlon)
   - Para: compras@brooklynfitboxing.com
   - 1 adjunto: confirmacion_envio.pdf

## 🎨 Capturas

### Login
![Login](https://via.placeholder.com/800x500/667eea/ffffff?text=Página+de+Login)

### Búsqueda
![Búsqueda](https://via.placeholder.com/800x500/667eea/ffffff?text=Página+de+Búsqueda)

## 💻 Comandos Útiles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo

# Producción
npm run build        # Compilar para producción
npm start            # Iniciar servidor de producción

# Linting (si se agrega)
npm run lint         # Verificar código
```

## 📝 Notas

- **Datos actuales son de PRUEBA**: Los resultados y PDFs son de ejemplo
- **Una vez configurado Gmail API**: Buscará en correos reales de todos los buzones corporativos
- **Sin base de datos**: Búsqueda directa en Gmail = siempre actualizado
- **100% gratuito**: Hosting en Vercel sin costo

## 🆘 Soporte

Si tienes problemas:

1. Verifica que Node.js esté instalado: `node --version`
2. Reinstala dependencias: `npm install`
3. Revisa el archivo `.env.local`
4. Consulta los logs en la terminal

## 🔗 Documentación Relacionada

- `proyecto-buscador-simple-sin-db.md` - Arquitectura completa
- `guia-configuracion-gmail-workspace-mcp.md` - Para admin
- `ejemplos-casos-uso-facturas.md` - Casos de uso reales

---

**Desarrollado con:** Next.js 16, React 19, TypeScript

**Estado:** MVP funcional - Listo para integrar con Gmail API
