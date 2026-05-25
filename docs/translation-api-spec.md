# Real-Time Translation API — Especificación técnica

**Cliente consumidor:** Mozilla Hubs (frontend React + A-Frame)
**Propósito:** Transcribir el audio del micrófono de cada usuario en una sala Hubs, traducirlo a uno o más idiomas, y devolver el resultado al cliente en tiempo real para mostrar subtítulos sobre los avatares.
**Última actualización:** 2026-05-14

---

## 1. Resumen del flujo

```
┌─────────────────────┐
│  Navegador (Hubs)   │
│                     │
│  Micrófono ─┐       │
│             │       │
│             ├──► Dialog/mediasoup (voz P2P entre peers, sin cambios)
│             │
│             └──► WebSocket ──► API de Traducción
│                                       │
│                                       ▼
│                                Transcripción + traducciones
│                                       │
│             ┌─────────────────────────┘
│             ▼
│  HubChannel (Phoenix) ──► broadcast a todos los peers de la sala
│             │
│             ▼
│  Render: NameTag 3D / SubtitleOverlay 2D
└─────────────────────┘
```

**Principios:**

1. Cada cliente abre **una** conexión WS al API con **su propio audio**. No mandamos audio de terceros.
2. El cliente reenvía el texto traducido al resto de la sala por su propio canal (Phoenix/Reticulum). El API **no** necesita conocer la topología de la sala ni hacer fan-out.
3. El audio para comunicación de voz sigue yendo por Dialog/mediasoup. El stream al API es **paralelo**, no reemplaza nada.

---

## 2. Transporte

### 2.1. Protocolo

- **WebSocket sobre TLS (`wss://`)** — obligatorio.
- Full-duplex: cliente envía audio binario y mensajes JSON de control; servidor envía mensajes JSON de transcripción/error.
- No se aceptan alternativas que no sean streaming bidireccional (descartados: REST polling, HTTP chunked transfer, SSE).

### 2.2. Endpoint

```
wss://api.tu-dominio/v1/translate/stream
```

Parámetros vía query string en la URL de conexión (alternativa: enviarlos en el mensaje `start`):

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `token` | string | sí | JWT efímero emitido por el backend (ver §6) |
| `session_id` | string | sí | UUID generado por el cliente, identifica la sesión |

### 2.3. Subprotocolo WebSocket

Sin subprotocolo específico requerido (`Sec-WebSocket-Protocol` puede omitirse). Si se quiere versionar, usar `translate-v1`.

### 2.4. CORS / orígenes permitidos

El servidor debe aceptar conexiones WebSocket desde el dominio donde está hospedado el cliente Hubs. Listar orígenes explícitos en producción (no `*`).

---

## 3. Formato de audio

### 3.1. Codecs aceptados (mínimo uno, ideal ambos)

| Codec | Container | Sample rate | Canales | Notas |
|-------|-----------|-------------|---------|-------|
| **Opus** | WebM | 48 000 Hz | 1 (mono) | **Preferido**. Lo emite `MediaRecorder` nativamente en navegadores. ~24 kbps. |
| **PCM 16-bit LE** | raw (sin container) | 16 000 Hz | 1 (mono) | Alternativa. Mejor calidad para STT pero requiere `AudioWorklet` para downsamplear. |

No se aceptan: MP3, AAC, FLAC, WAV con headers por chunk.

### 3.2. Framing

- Cada **mensaje binario** del WebSocket = un chunk de audio.
- Tamaño objetivo por chunk: **20–100 ms** de audio.
  - Opus/WebM: blobs que produce `MediaRecorder` con `timeslice: 100`.
  - PCM 16 kHz: 320 muestras = 20 ms = 640 bytes, o múltiplos.
- El servidor debe tolerar variabilidad razonable en el tamaño de chunk (jitter de red).

### 3.3. Codificación de mensajes

- **Audio:** WebSocket binary frames (opcode 0x2).
- **Control:** WebSocket text frames (opcode 0x1) con JSON UTF-8.

---

## 4. Mensajes de control

### 4.1. Cliente → Servidor

#### `start` (obligatorio, primer mensaje tras la apertura del WS)

```json
{
  "type": "start",
  "audio": {
    "encoding": "opus-webm",
    "sample_rate": 48000,
    "channels": 1
  },
  "source_lang": "auto",
  "target_langs": ["es", "en"],
  "interim_results": true,
  "vad": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "hub_id": "AbCdEfG",
    "speaker_display_name": "Alice"
  }
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `type` | `"start"` | sí | Discriminador |
| `audio.encoding` | `"opus-webm"` \| `"pcm16"` | sí | Codec que vamos a enviar |
| `audio.sample_rate` | number | sí | Hz |
| `audio.channels` | number | sí | Siempre 1 |
| `source_lang` | string \| `"auto"` | sí | ISO 639-1; `"auto"` si queremos detección automática |
| `target_langs` | string[] | sí | Lista de idiomas destino (ISO 639-1). Mínimo 1 |
| `interim_results` | boolean | no (default `true`) | Si queremos parciales antes del `is_final` |
| `vad` | boolean | no (default `true`) | Servidor descarta silencios y no factura ese tiempo |
| `session_id` | string (UUID) | sí | Identifica la sesión; usado para reconexión |
| `metadata` | object | no | Opaco para el servidor, útil para logs |

#### `stop` (opcional, cierre limpio)

```json
{ "type": "stop" }
```

Pide al servidor que flushee el último parcial como final y cierre. Tras esto el cliente puede cerrar el WS.

#### `keepalive` (opcional)

```json
{ "type": "keepalive" }
```

Si pasan más de 15 s sin audio (mic muteado), enviar cada 15 s para evitar timeout. El servidor responde con `pong` o lo ignora.

### 4.2. Servidor → Cliente

#### `ready`

Tras recibir `start` y validar:

```json
{ "type": "ready", "session_id": "550e8400-..." }
```

A partir de aquí el cliente empieza a enviar audio. El servidor **no** debe procesar audio recibido antes de enviar `ready`.

#### `transcript`

```json
{
  "type": "transcript",
  "is_final": false,
  "start_ms": 1240,
  "end_ms": 1980,
  "source_lang": "es",
  "original": "hola que tal",
  "translations": {
    "en": "hello how are you",
    "fr": "salut ça va"
  },
  "confidence": 0.91,
  "segment_id": "seg-42"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `is_final` | boolean | `false` = parcial (puede cambiar), `true` = definitivo |
| `start_ms` / `end_ms` | number | Offset en ms desde el inicio de la sesión |
| `source_lang` | string | Idioma detectado (útil si pediste `"auto"`) |
| `original` | string | Transcripción en el idioma de origen |
| `translations` | `{ [lang]: string }` | Una entrada por cada `target_lang` solicitado |
| `confidence` | number | 0–1; opcional |
| `segment_id` | string | Identificador estable: parciales y final del mismo segmento comparten id |

**Importante:** los parciales y el final de un mismo segmento de habla deben compartir `segment_id` para que el cliente pueda reemplazar el parcial por el final sin parpadeo.

#### `error`

```json
{
  "type": "error",
  "code": "AUDIO_DECODE_FAILED",
  "message": "Could not decode opus-webm frame",
  "fatal": true
}
```

Si `fatal: true`, el servidor cerrará el WS tras este mensaje. Si `fatal: false`, la sesión continúa.

Códigos esperados (no exhaustivo):

- `AUTH_FAILED` — token inválido/expirado (fatal)
- `INVALID_START` — mensaje `start` malformado (fatal)
- `AUDIO_DECODE_FAILED` — chunk de audio corrupto (no fatal)
- `UNSUPPORTED_LANG` — `target_lang` no soportado (fatal o no, según severidad)
- `RATE_LIMITED` — demasiadas sesiones para este token (fatal)
- `INTERNAL_ERROR` — error del servidor (fatal)

#### `pong` (opcional)

Respuesta a `keepalive`.

```json
{ "type": "pong" }
```

---

## 5. Ciclo de vida de la conexión

1. Cliente abre `wss://...?token=...&session_id=...`.
2. Cliente envía `start`.
3. Servidor valida → envía `ready`.
4. Cliente envía audio binario continuo + opcionalmente `keepalive` durante silencios.
5. Servidor envía `transcript` (parciales y finales) según procesa.
6. Cliente termina con `stop` → servidor flushea último final → cliente cierra WS.

### 5.1. Reconexión

Si el WS se cae inesperadamente, el cliente reabrirá con el **mismo `session_id`**. El servidor debería:

- Aceptar la reconexión como continuación de la sesión.
- Reanudar sin perder contexto de idioma detectado.
- Aceptar audio sin requerir re-envío del que ya procesó (no soportamos resume con offsets, simplemente continuamos donde quedó el flujo).

Si el `session_id` no se reconoce (timeout server-side), empezar sesión nueva sin error.

### 5.2. Timeouts

| Evento | Timeout objetivo |
|--------|------------------|
| Tiempo entre apertura WS y `start` | 5 s, luego cerrar con `INVALID_START` |
| Inactividad (sin audio ni keepalive) | 60 s, luego cerrar |
| Sesión total máxima | 4 h (configurable) |

---

## 6. Autenticación

- **No se aceptan API keys en el cliente.** El frontend Hubs nunca debe ver la clave del proveedor STT subyacente.
- Backend Reticulum (Phoenix) emitirá un **JWT efímero** firmado con clave compartida con el API de traducción.
  - Vida útil: 5–15 minutos.
  - Claims mínimos: `sub` (user_id), `hub_id`, `exp`, `iat`, `aud: "translation-api"`.
- El JWT viaja en query string (`?token=...`) o en el campo `token` del mensaje `start`. Headers HTTP personalizados **no** funcionan en WebSockets desde el navegador.
- El servidor valida firma + expiración antes de enviar `ready`. Token inválido → `error code: AUTH_FAILED` + cierre.

---

## 7. Requisitos no funcionales

### 7.1. Latencia (críticos)

| Métrica | Objetivo p95 | Inaceptable |
|---------|--------------|-------------|
| Apertura WS → `ready` | < 200 ms | > 1 s |
| Audio enviado → primer parcial visible | **< 500 ms** | > 1 s |
| Final tras fin de habla | < 800 ms | > 2 s |
| Traducción tras el final del original | < 300 ms adicionales | > 1 s |

Si el API no puede cumplir estos números, los subtítulos se sentirán desincronizados con la conversación y pierden valor.

### 7.2. Concurrencia

- Dimensionar para **N sesiones simultáneas = N usuarios hablando en paralelo en todas las salas activas**.
- Pico estimado a confirmar con el equipo de producto (ej.: 200 sesiones concurrentes inicial, escalable a 2000).
- Una sesión = un cliente WS. No multiplexar varios hablantes en una sola conexión.

### 7.3. Robustez

- **Backpressure:** si el procesamiento se atrasa, descartar audio antiguo en vez de acumular cola. Mejor perder unos ms que generar drift creciente.
- **Sin pérdida en parciales:** está bien que parciales se sobreescriban, pero los `is_final: true` no deben perderse.
- **Reconexión transparente:** ver §5.1.

### 7.4. Idiomas

- Idiomas mínimos requeridos para v1 (a confirmar): `es`, `en`, `pt`, `fr`, `de`, `it`, `zh`, `ja`.
- Detección automática (`source_lang: "auto"`) requerida.
- Multi-target en una sola sesión: si en la sala hay 3 idiomas distintos, debe poder traducir a los 3 simultáneamente sin abrir 3 conexiones.

### 7.5. Seguridad y privacidad

- TLS 1.2+ obligatorio.
- **No persistir audio** salvo retención mínima para debugging (≤ 24 h, opt-out).
- **No persistir transcripciones** asociadas a usuario sin consentimiento explícito.
- Logs operacionales solo con `session_id`, no con contenido.
- Cumplimiento GDPR: endpoint admin para borrar datos por `user_id` bajo demanda.

### 7.6. Observabilidad (cliente debe poder pedir)

Métricas operativas que el servidor debe exponer (idealmente vía dashboard, no en cada mensaje):

- Latencia por sesión (apertura → ready, audio → parcial, audio → final).
- Bytes recibidos y ms de audio procesados por sesión.
- Tasa de errores por código.
- Sesiones concurrentes.
- Idiomas detectados / traducciones servidas.

---

## 8. Lo que NO necesitamos del API (para evitar scope creep)

- **Diarización** (separar hablantes en un mismo audio): no, cada sesión es un solo hablante por diseño.
- **Audio sintético TTS** de la traducción: no en v1. Solo texto.
- **Almacenamiento de transcripciones**: no, el cliente las distribuye y descarta.
- **Fan-out a múltiples clientes**: no, Hubs ya tiene su propio canal (Phoenix) para eso.
- **Webhooks / callbacks HTTP**: no, todo va por el WebSocket de la propia sesión.

---

## 9. Ejemplo end-to-end (pseudo-código cliente)

```js
const ws = new WebSocket(
  `wss://api.tu-dominio/v1/translate/stream?token=${jwt}&session_id=${uuid}`
);

ws.binaryType = "arraybuffer";

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "start",
    audio: { encoding: "opus-webm", sample_rate: 48000, channels: 1 },
    source_lang: "auto",
    target_langs: ["es", "en"],
    interim_results: true,
    vad: true,
    session_id: uuid
  }));
};

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  switch (msg.type) {
    case "ready":
      startMediaRecorder(); // empieza a streamear opus chunks
      break;
    case "transcript":
      renderSubtitle(msg); // parcial o final, según is_final
      if (msg.is_final) broadcastToRoom(msg); // Phoenix HubChannel
      break;
    case "error":
      console.error(msg);
      if (msg.fatal) ws.close();
      break;
  }
};

function startMediaRecorder() {
  const rec = new MediaRecorder(micStream, {
    mimeType: "audio/webm;codecs=opus",
    audioBitsPerSecond: 24000
  });
  rec.ondataavailable = (e) => {
    if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
      e.data.arrayBuffer().then(buf => ws.send(buf));
    }
  };
  rec.start(100); // chunks de 100 ms
}
```

---

## 10. Checklist de aceptación

Antes de considerar el API listo para integración, el equipo del backend debe demostrar:

- [ ] Conexión `wss://` con JWT válido devuelve `ready` en < 200 ms.
- [ ] Audio Opus/WebM 48 kHz mono en chunks de 100 ms produce parciales en < 500 ms p95.
- [ ] Audio PCM 16 kHz mono produce el mismo resultado (si se soporta).
- [ ] Múltiples `target_langs` se devuelven en el mismo mensaje `transcript`.
- [ ] `segment_id` consistente entre parciales y final del mismo segmento.
- [ ] Reconexión con mismo `session_id` continúa sin reset de contexto.
- [ ] JWT expirado devuelve `AUTH_FAILED` y cierra el WS.
- [ ] 100 sesiones concurrentes sostienen latencia p95 dentro de objetivos.
- [ ] Detección automática de idioma funciona con `source_lang: "auto"`.
- [ ] Documentación OpenAPI/AsyncAPI publicada y versionada.
