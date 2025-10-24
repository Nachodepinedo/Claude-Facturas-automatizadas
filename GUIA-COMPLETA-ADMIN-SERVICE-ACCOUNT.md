# 🔐 Guía Completa: Configurar Service Account desde CERO

**Para:** Administradora de Google Workspace  
**Objetivo:** Configurar acceso completo para buscar facturas en todos los correos de `@brooklynfitboxing.com`  
**Tiempo estimado:** 30-45 minutos  
**Requisitos:** Ser Super Admin de Google Workspace

---

## 📋 Índice

1. [Crear Proyecto en Google Cloud](#1-crear-proyecto-en-google-cloud)
2. [Habilitar APIs necesarias](#2-habilitar-apis-necesarias)
3. [Crear Service Account](#3-crear-service-account)
4. [Generar y descargar credenciales JSON](#4-generar-y-descargar-credenciales-json)
5. [Configurar Domain-Wide Delegation en Google Cloud](#5-configurar-domain-wide-delegation-en-google-cloud)
6. [Autorizar Service Account en Workspace Admin](#6-autorizar-service-account-en-workspace-admin)
7. [Entregar credenciales al desarrollador](#7-entregar-credenciales-al-desarrollador)
8. [Verificación final](#8-verificación-final)

---

## 1. Crear Proyecto en Google Cloud

### 1.1. Ir a Google Cloud Console

Abre en tu navegador:
```
https://console.cloud.google.com
```

### 1.2. Crear nuevo proyecto

1. **Hacer clic** en el selector de proyectos (arriba a la izquierda)
2. **Hacer clic** en "NUEVO PROYECTO"
3. **Rellenar el formulario:**

   ```
   Nombre del proyecto: facturas-brooklynfitboxing
   Organización: brooklynfitboxing.com (si aparece)
   Ubicación: Sin organización (si no aparece la anterior)
   ```

4. **Hacer clic** en "CREAR"
5. **Esperar** 10-20 segundos a que se cree el proyecto
6. **Seleccionar** el proyecto recién creado en el selector de proyectos

### ✅ Verificación

Debes ver arriba a la izquierda: **"facturas-brooklynfitboxing"**

---

## 2. Habilitar APIs necesarias

### 2.1. Habilitar Gmail API

1. **En el menú lateral** → Buscar "APIs y servicios" → "Biblioteca"
2. **Buscar** en el buscador: `Gmail API`
3. **Hacer clic** en "Gmail API"
4. **Hacer clic** en "HABILITAR"
5. **Esperar** a que se habilite (10-15 segundos)

### 2.2. Habilitar Admin SDK API

1. **Volver** a "Biblioteca" (botón atrás o menú lateral)
2. **Buscar** en el buscador: `Admin SDK API`
3. **Hacer clic** en "Admin SDK API"
4. **Hacer clic** en "HABILITAR"
5. **Esperar** a que se habilite

### ✅ Verificación

En "APIs y servicios" → "APIs y servicios habilitados" deben aparecer:
- ✅ Gmail API
- ✅ Admin SDK API

---

## 3. Crear Service Account

### 3.1. Navegar a Service Accounts

1. **En el menú lateral:** "IAM y administración" → "Cuentas de servicio"
2. **Hacer clic** en "CREAR CUENTA DE SERVICIO"

### 3.2. Rellenar detalles de la cuenta

**Paso 1: Detalles de la cuenta de servicio**

```
Nombre de la cuenta de servicio: buscador-facturas-brooklyn
ID de la cuenta de servicio: buscador-facturas-brooklyn
(se genera automáticamente)

Descripción: Service Account para acceder a Gmail y buscar facturas en todos los buzones del dominio
```

**Hacer clic** en "CREAR Y CONTINUAR"

**Paso 2: Otorgar acceso (opcional)**

**Dejar en blanco** - Hacer clic en "CONTINUAR"

**Paso 3: Otorgar acceso a usuarios (opcional)**

**Dejar en blanco** - Hacer clic en "LISTO"

### ✅ Verificación

Debes ver la cuenta de servicio creada con un email como:
```
buscador-facturas-brooklyn@facturas-brooklynfitboxing.iam.gserviceaccount.com
```

---

## 4. Generar y descargar credenciales JSON

### 4.1. Acceder a la cuenta de servicio

1. **Hacer clic** en el email de la cuenta de servicio recién creada
2. Ir a la pestaña **"CLAVES"**

### 4.2. Crear nueva clave

1. **Hacer clic** en "AGREGAR CLAVE" → "Crear clave nueva"
2. **Seleccionar** tipo: **JSON**
3. **Hacer clic** en "CREAR"

### 4.3. Guardar el archivo JSON

Se descargará automáticamente un archivo como:
```
facturas-brooklynfitboxing-a1b2c3d4e5f6.json
```

**⚠️ MUY IMPORTANTE:**
- **Guardar este archivo en un lugar SEGURO**
- **NO compartirlo públicamente**
- **NO subirlo a GitHub o email sin cifrar**
- Este archivo es como una contraseña maestra

### ✅ Verificación

Tienes el archivo JSON descargado en tu computadora.

---

## 5. Configurar Domain-Wide Delegation en Google Cloud

### 5.1. Habilitar Domain-Wide Delegation

1. **En la página de la cuenta de servicio** (donde estás)
2. **Hacer clic** en la pestaña "DETALLES"
3. **Sección "Domain-Wide Delegation"**
4. **Hacer clic** en "HABILITAR LA DELEGACIÓN EN TODO EL DOMINIO DE G SUITE"
5. Aparecerá un popup:

   ```
   Nombre para mostrar del producto de consentimiento:
   Buscador de Facturas Brooklyn Fitboxing
   
   Correo electrónico para el soporte del producto:
   admin@brooklynfitboxing.com
   ```

6. **Hacer clic** en "GUARDAR"

### 5.2. Copiar el Client ID

**⚠️ IMPORTANTE:** Necesitarás este número para el siguiente paso.

1. **En la misma página**, encontrarás un campo llamado **"ID de cliente de OAuth 2.0"**
2. Es un número largo como: `101505659253320838713`
3. **COPIAR este número** (lo necesitarás en el paso 6)

### ✅ Verificación

- Domain-Wide Delegation está habilitado
- Tienes el Client ID copiado

---

## 6. Autorizar Service Account en Workspace Admin

**⚠️ Necesitas ser Super Admin de Google Workspace para este paso**

### 6.1. Ir a Google Workspace Admin Console

Abre en tu navegador:
```
https://admin.google.com
```

### 6.2. Navegar a Domain-Wide Delegation

**Ruta completa:**

1. **Hacer clic** en "Seguridad" (en el menú principal)
   - Si no lo ves, hacer clic en "Mostrar más" abajo del menú

2. **Hacer clic** en "Acceso y control de datos"

3. **Hacer clic** en "Controles de API"

4. **Hacer clic** en "ADMINISTRAR DELEGACIÓN EN TODO EL DOMINIO"

### 6.3. Agregar nuevo Client ID

1. **Hacer clic** en "Agregar nuevo"

2. **Rellenar el formulario:**

   ```
   ID de cliente:
   [PEGAR el Client ID que copiaste en el paso 5.2]
   Ejemplo: 101505659253320838713
   
   Ámbitos de OAuth (uno por línea O separados por comas):
   https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/admin.directory.user.readonly
   ```

   **⚠️ IMPORTANTE:** Asegúrate de copiar EXACTAMENTE estos 4 scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/admin.directory.user.readonly`

3. **Hacer clic** en "AUTORIZAR"

### 6.4. Verificar que se agregó correctamente

Deberías ver en la lista:

```
Cliente API: 101505659253320838713
Ámbito: https://www.googleapis.com/auth/gmail.readonly, https://www.googleapis.com/auth/gmail.send, https://www.googleapis.com/auth/gmail.modify, https://www.googleapis.com/auth/admin.directory.user.readonly
```

### ✅ Verificación

El Service Account aparece en la lista de "Clientes API autorizados"

---

## 7. Entregar credenciales al desarrollador

### 7.1. Preparar el archivo JSON

Tienes dos opciones:

#### Opción A: Entregar el archivo JSON (más fácil)

1. **Compartir el archivo JSON** descargado en el paso 4 de forma segura
   - Por ejemplo: Google Drive (compartido solo con él), USB, etc.

#### Opción B: Copiar el contenido (más seguro para producción)

1. **Abrir el archivo JSON** con un editor de texto
2. **Copiar TODO el contenido** (incluyendo las llaves `{ }`)
3. **Enviar por canal seguro** al desarrollador

### 7.2. Proporcionar información adicional

**Enviar al desarrollador:**

```
✅ Archivo JSON del Service Account (o su contenido)

✅ Información del dominio:
   - Dominio: brooklynfitboxing.com
   - Email admin: admin@brooklynfitboxing.com (tu email de super admin)

✅ Confirmación:
   - Domain-Wide Delegation está habilitado
   - Los 4 scopes están autorizados:
     ✓ gmail.readonly
     ✓ gmail.send
     ✓ gmail.modify
     ✓ admin.directory.user.readonly
```

---

## 8. Verificación final

### 8.1. Checklist completo

Verifica que completaste TODO:

- [ ] Proyecto creado en Google Cloud Console
- [ ] Gmail API habilitada
- [ ] Admin SDK API habilitada
- [ ] Service Account creado
- [ ] Archivo JSON descargado y guardado de forma segura
- [ ] Domain-Wide Delegation habilitado en Google Cloud
- [ ] Client ID copiado
- [ ] Service Account autorizado en Workspace Admin Console
- [ ] Los 4 scopes configurados correctamente
- [ ] Credenciales entregadas al desarrollador
- [ ] Email de admin proporcionado al desarrollador

### 8.2. Información a proporcionar al desarrollador

**El desarrollador necesita crear un archivo `.env.local` con:**

```env
# Autenticación de la aplicación
AUTH_USER=cualquier-email@brooklynfitboxing.com
AUTH_PASSWORD=cualquier-contraseña-que-quieras

# Secret para tokens JWT (cualquier texto aleatorio largo)
JWT_SECRET=genera-un-secreto-aleatorio-muy-largo-aqui-123456

# Gmail API - IMPORTANTE
GMAIL_SERVICE_ACCOUNT_JSON={"type":"service_account",...CONTENIDO COMPLETO DEL JSON...}

# Configuración del dominio
GMAIL_DOMAIN=brooklynfitboxing.com
GMAIL_ADMIN_EMAIL=admin@brooklynfitboxing.com

# OPCIONAL: Déjalo vacío para buscar en TODOS los buzones
# GMAIL_MAILBOXES=
```

---

## 🐛 Troubleshooting

### Error: "No puedo ver Seguridad en Admin Console"

**Solución:** No tienes permisos de Super Admin. Contacta con el Super Admin de la organización.

### Error: "La API no está habilitada"

**Solución:** Vuelve al paso 2 y asegúrate de habilitar Gmail API y Admin SDK API.

### Error: "No encuentro Domain-Wide Delegation en Workspace Admin"

**Solución:** 
1. Ve a https://admin.google.com
2. Seguridad → Acceso y control de datos → Controles de API
3. Si no ves "Controles de API", puede que tu organización tenga restricciones

### El desarrollador reporta: "credentials not configured"

**Verificar:**
1. El archivo JSON se copió completo (incluyendo `{` y `}`)
2. Se copió en el `.env.local` correctamente
3. El servidor se reinició después de agregar las variables

### El desarrollador reporta: "unauthorized"

**Verificar:**
1. Domain-Wide Delegation está habilitado en Google Cloud
2. El Client ID está autorizado en Workspace Admin
3. Los 4 scopes están configurados correctamente
4. El email de admin tiene permisos de Super Admin

---

## 📞 Soporte

Si tienes problemas durante la configuración:

1. **Verifica** que eres Super Admin de Google Workspace
2. **Revisa** que estás en la organización correcta
3. **Comprueba** los permisos de tu cuenta
4. **Consulta** la documentación oficial de Google:
   - [Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
   - [Domain-Wide Delegation](https://developers.google.com/admin-sdk/directory/v1/guides/delegation)

---

## 🎉 ¡Configuración Completa!

Una vez completados todos los pasos:

1. ✅ El desarrollador podrá buscar en TODOS los buzones de `@brooklynfitboxing.com`
2. ✅ No necesitará contraseñas individuales de cada buzón
3. ✅ La aplicación buscará automáticamente en todos los correos
4. ✅ Todo funcionará de forma segura con el Service Account

**Tiempo de propagación:** Los cambios pueden tardar 5-10 minutos en aplicarse completamente.

---

**Fecha de creación:** Octubre 2025  
**Versión:** 1.0  
**Para:** Brooklyn Fitboxing  
