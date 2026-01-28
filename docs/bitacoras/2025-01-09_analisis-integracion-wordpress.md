# Bitácora - Análisis para Integración WordPress Login

**Fecha:** 2025-01-09
**Autor:** Claude Code

## Objetivos del Proyecto

1. Agregar un sistema de login sencillo usando WordPress como backend
2. Permitir entrada como "modo ghost" si no está logueado
3. Opción en menú para cargar WordPress en iframe en modal donde se deba estar logueado

## Análisis del Sistema Actual

### Estructura de Autenticación Actual (Mozilla Hubs)

1. **Componentes clave:**
   - `RoomEntryModal` (línea 854 ui-root.js) - Modal de entrada al room
   - `AuthChannel` - Maneja autenticación via email/token
   - `AuthContext` - Context provider para estado de autenticación
   - `RoomSignInModalContainer` - Modal actual de login
   - `signedIn` state - Estado global de autenticación

2. **Flujo actual:**
   - Usuario ingresa email
   - Sistema envía link de verificación por email
   - Usuario clickea link para completar autenticación
   - Token JWT se guarda en store local

3. **Modo Ghost actual:**
   - Ya existe concepto de "ghost" mode (`isGhost` en línea 989-990)
   - Se activa cuando `configs.feature("enable_lobby_ghosts")` && (`watching` || `hide`)

### Sistema de Iframes Existente

- Ya existe `WebPageUrlModalContainer` que puede mostrar iframes en modales
- Implementación en líneas 692-697 de ui-root.js
- Event handler `show_iframe` funcional

## Arquitectura WordPress Backend

### Opciones para Plugin WordPress

1. **REST API personalizada** - Crear endpoints para autenticación
2. **JWT Authentication** - Plugin existente para JWT tokens
3. **Custom Auth Hook** - Hooks personalizados para login/logout

## Enfoques de Implementación

### Enfoque 1: JWT Token Bridge (Recomendado)

**Descripción:** Usar WordPress JWT Authentication plugin y adaptar el AuthChannel existente

**Componentes:**
- Plugin WordPress: WP JWT Authentication
- Modificar `AuthChannel` para conectar con WordPress
- Mantener flujo de UI existente

**Pros:**
- Reutiliza infraestructura existente
- Seguro (JWT tokens)
- Integración limpia

**Cons:**
- Requiere plugin WordPress
- Modificación del backend

### Enfoque 2: Iframe Login + PostMessage

**Descripción:** Login via iframe WordPress con comunicación PostMessage

**Componentes:**
- Modal con iframe al login de WordPress
- PostMessage para comunicación
- Custom WordPress hook para enviar resultado

**Pros:**
- Usa sistema de login WordPress nativo
- No modifica backend significativamente

**Cons:**
- Más complejo manejo de comunicación
- Posibles problemas de CORS

### Enfoque 3: Hybrid - Iframe + REST API

**Descripción:** Iframe para UX, REST API para verificación

**Componentes:**
- Iframe para login visual
- REST API WordPress para verificar estado
- Polling o PostMessage para detectar login

**Pros:**
- UX familiar de WordPress
- Backend robusto
- Fallback options

**Cons:**
- Más complejo de implementar
- Requiere ambos sistemas

## Consideraciones Técnicas

### Seguridad
- CORS headers en WordPress
- Validación de tokens
- Secure cookies para sesiones

### UX/UI  
- Integración con diseño existente
- Loading states
- Error handling

### Performance
- Caching de tokens
- Lazy loading de iframe
- Optimización de requests

## Próximos Pasos Recomendados

1. **Fase 1:** Implementar Enfoque 1 (JWT Bridge)
2. **Fase 2:** Agregar Enfoque 2 como fallback
3. **Fase 3:** Optimizaciones y testing

## Archivos a Modificar

- `src/react-components/room/RoomEntryModal.js`
- `src/utils/auth-channel.js` 
- `src/react-components/auth/AuthContext.js`
- Nuevos archivos para WordPress integration