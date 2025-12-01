/**
 * Mapeo de usuarios a grupos de Google
 * Lee la configuracion de la variable de entorno USER_GROUP_MAPPINGS
 * Formato: userEmail:groupEmail:groupName,userEmail2:groupEmail2:groupName2,...
 */

export interface UserGroupMapping {
  userEmail: string
  groupEmail: string
  groupName: string
}

// Parsear la variable de entorno
function parseUserGroupMappings(): UserGroupMapping[] {
  const envValue = process.env.USER_GROUP_MAPPINGS
  
  if (!envValue) {
    console.warn('USER_GROUP_MAPPINGS not configured')
    return []
  }
  
  try {
    // Formato: email1:group1:name1,email2:group2:name2
    return envValue.split(',').map(entry => {
      const [userEmail, groupEmail, groupName] = entry.trim().split(':')
      return { userEmail, groupEmail, groupName }
    }).filter(m => m.userEmail && m.groupEmail && m.groupName)
  } catch (error) {
    console.error('Error parsing USER_GROUP_MAPPINGS:', error)
    return []
  }
}

// Cache de los mappings
let cachedMappings: UserGroupMapping[] | null = null

function getMappings(): UserGroupMapping[] {
  if (!cachedMappings) {
    cachedMappings = parseUserGroupMappings()
  }
  return cachedMappings
}

/**
 * Obtiene el grupo asignado a un usuario
 */
export function getGroupForUser(userEmail: string): string | null {
  const mappings = getMappings()
  const mapping = mappings.find(m => m.userEmail === userEmail)
  return mapping ? mapping.groupEmail : null
}

/**
 * Obtiene el nombre del grupo asignado a un usuario
 */
export function getGroupNameForUser(userEmail: string): string | null {
  const mappings = getMappings()
  const mapping = mappings.find(m => m.userEmail === userEmail)
  return mapping ? mapping.groupName : null
}
