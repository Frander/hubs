# Real-Time Translation WebSocket API

This document is intended for client developers integrating the real-time translation service.

Recommended integration sequence:

1. Establish WebSocket connection with token
2. Send `start` JSON message
3. Wait for server `ready` response
4. Transmit binary audio frames
5. Receive `transcript` results
6. Send `stop` upon session termination

------

## 1. API Overview

This API receives real-time audio streams over WebSocket, and returns speech recognition text of the source language as well as translated text of target language in real time.

### Supported Features

- WebSocket transmission
- JSON control messages
- Binary audio frame delivery
- Pre-session token authentication
- Browser-compatible Opus/WebM audio
- Native client PCM16 audio
- Partial and final transcript events
- Consistent `segment_id` across partial and final results
- Reconnection with identical `session_id` during service runtime

### Unsupported Functions

- Multiple target languages in one single session
- Session state persistence after service restart
- Resume audio transmission from offset after reconnection

------

## 2. Endpoint Address

**Production**

```
wss://ws.pupillae28.com:50161/v1/translate/stream
```

**Local Development**

```
ws://127.0.0.1:8765/v1/translate/stream
```

### Query Parameters

|   Parameter    |  Required   |                         Description                          |
| :------------: | :---------: | :----------------------------------------------------------: |
|  `session_id`  | Recommended | Client-generated session ID. Auto-assigned by server if omitted. Reuse the same ID for reconnection. |
|    `token`     |  Optional   | Alternative token delivery when request header cannot be set. |
| `access_token` |  Optional   |              Alternative token parameter name.               |

Recommended Connection URL

text

```
wss://ws.pupillae28.com:50161/v1/translate/stream?session_id=550e8400-e29b-41d4-a716-446655440000
```

------

## 3. Authentication

Valid token is mandatory for WebSocket connection establishment. Token validity period: 60 minutes.

Token acquisition endpoint:

plaintext

```
https://spacemail.pupillae28.com:50161/login
```

Request Method: `POST`

Request Body json

```
{
  "username": "spacemail",
  "password": "123456"
}
```

Response Data json

```
{
    "msg": "operation success",
    "code": 200,
    "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzcGFjZW1haWwiLCJsb2dpbl91c2VyX2tleSI6IjdlZGJkNmJiLTEzMzgtNDExNy1hMTQyLTA2YmY1ZjAzMWFmYyJ9.yHIL-Kgoo1QpoExhhQzVPl1lUrntACk2ROEOo4RFQbkBfwEsKxUhi7Z493C3gLsz7ptC-dLPFpQ7Bp_F7bL4Wg"
}
```

Curl Command

```
curl --location 'https://spacemail.pupillae28.com:50161/login' \
--header 'Content-Type: application/json' \
--data '{
  "username": "spacemail",
  "password": "123456"
}'
```

### Token Delivery Methods

Preferred Header Mode

```
Authorization: Bearer <token>
```

Alternative URL Parameter Mode

```
wss://ws.pupillae28.com:50161/v1/translate/stream?session_id=<session_id>&token=<token>
```

### Server Authentication Flow

1. Client connects WebSocket with token
2. Server extracts token from authorization header or URL parameters
3. Server invokes configured authentication callback
4. Session continues if callback returns HTTP 200
5. Connection closed with `INVALID_TOKEN` error if verification fails

### Authentication Callback Request Initiated by Server

```
POST /ai/callback
Authorization: Bearer <token>
Request Body: empty
```

### Authentication Failure Message

```
{
  "type": "error",
  "code": "INVALID_TOKEN",
  "message": "Invalid token",
  "fatal": true
}
```

------

## 4. End-to-End Message Flow

text

```
Client                                        Server
  |                                           |
  |-- WebSocket connect + token ------------>|
  |                                           |-- POST auth callback
  |                                           |<- HTTP 200
  |-- start JSON --------------------------->|
  |<- ready ---------------------------------|
  |-- binary audio frame ------------------->|
  |-- binary audio frame ------------------->|
  |<- transcript partial --------------------|
  |<- transcript final ----------------------|
  |-- keepalive JSON ----------------------->|
  |<- pong ----------------------------------|
  |-- stop JSON ---------------------------->|
  |                                           |
```

### Core Rules

- The first message sent by client must be `start`
- Do not send audio data before receiving `ready`
- Audio data shall be transmitted as pure WebSocket binary frame, not wrapped in JSON or Base64
- Session can be terminated by closing connection; sending `stop` is recommended for graceful exit

------

## 5. Minimal Browser Example

javascript

```
const sessionId = crypto.randomUUID();
const token = 'YOUR_TOKEN';
const ws = new WebSocket(`wss://example.com/v1/translate/stream?session_id=${sessionId}`);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'start',
    audio: {
      encoding: 'opus-webm',
      sample_rate: 48000,
      channels: 1,
      bits: 16
    },
    source_lang: 'es',
    target_langs: ['zh'],
    interim_results: true,
    vad: true,
    session_id: sessionId
  }));
};

ws.onmessage = event => {
  const message = JSON.parse(event.data);

  if (message.type === 'ready') {
    console.log('server is ready, start sending audio');
  }

  if (message.type === 'transcript') {
    console.log(message.original, message.translations);
  }

  if (message.type === 'error') {
    console.error(message.code, message.message);
  }
};
```

### Browser Limitation

Native WebSocket constructor cannot directly set authorization header. Use reverse proxy to inject headers or pass token via URL query parameters.

------

## 6. Client-to-Server Messages

### 6.1 Start

Initiate and configure translation session. Must be the first message after successful authentication.

Opus/WebM Example

```
{
  "type": "start",
  "audio": {
    "encoding": "opus-webm",
    "sample_rate": 48000,
    "channels": 1,
    "bits": 16
  },
  "source_lang": "es",
  "target_langs": ["zh"],
  "interim_results": true,
  "vad": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "speaker_display_name": "Alice"
  }
}
```

PCM16 Example

```
{
  "type": "start",
  "audio": {
    "encoding": "pcm16",
    "sample_rate": 16000,
    "channels": 1,
    "bits": 16
  },
  "source_lang": "es",
  "target_langs": ["zh"],
  "interim_results": true,
  "vad": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Field Description

|        Field        |   Type   | Required |                         Description                          |
| :-----------------: | :------: | :------: | :----------------------------------------------------------: |
|       `type`        |  string  |   Yes    |                     Fixed value: `start`                     |
|  `audio.encoding`   |  string  |   Yes    | Supported: opus-webm, webm, webm_opus, pcm16, pcm_s16le, wav |
| `audio.sample_rate` |  number  |   Yes    |             48000 for Opus/WebM, 16000 for PCM16             |
|  `audio.channels`   |  number  |   Yes    |               Only mono channel `1` supported                |
|    `audio.bits`     |  number  | Optional |                     Set to 16 for PCM16                      |
|    `source_lang`    |  string  |   Yes    |                     Source language code                     |
|   `target_langs`    | string[] |   Yes    |          Target language list, single language only          |
|  `interim_results`  | boolean  | Optional |                 Enable partial result return                 |
|        `vad`        | boolean  | Optional |               Voice activity detection switch                |
|    `session_id`     |  string  |   Yes    |          Unique session identifier for reconnection          |
|     `metadata`      |  object  | Optional |                    Custom client metadata                    |

### 6.2 Binary Audio Frame

Send raw audio chunks as binary payload only after receiving `ready`.

Recommended Chunk Size

|      Format      |       Recommended Fragment        |
| :--------------: | :-------------------------------: |
|    Opus/WebM     | 100ms per chunk via MediaRecorder |
| 16kHz Mono PCM16 |   3200 bytes equals 100ms audio   |

### 6.3 Keepalive

Maintain idle connection

```
{
  "type": "keepalive"
}
```

Server Response

```
{
  "type": "pong"
}
```

### 6.4 Stop

Gracefully terminate translation session

```
{
  "type": "stop"
}
```

------

## 7. Server-to-Client Messages

### 7.1 Ready

Session ready notification

```
{
  "type": "ready",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 7.2 Transcript

Partial or final recognition & translation result

```
{
  "type": "transcript",
  "is_final": false,
  "start_ms": 20,
  "end_ms": 1300,
  "source_lang": "es",
  "original": "Hola,",
  "translations": {
    "zh": "Hello,"
  },
  "confidence": null,
  "segment_id": "seg-1"
}
```

### Field Description

|     Field      |      Type      |                Description                 |
| :------------: | :------------: | :----------------------------------------: |
|     `type`     |     string     |         Fixed value: `transcript`          |
|   `is_final`   |    boolean     |  Partial(false) / Final(true) result flag  |
|   `start_ms`   |     number     |       Speech segment start timestamp       |
|    `end_ms`    |     number     |        Speech segment end timestamp        |
| `source_lang`  |     string     |            Source language code            |
|   `original`   |     string     |          Recognized original text          |
| `translations` |     object     | Translated content mapped by language code |
|  `confidence`  | number \| null |        Recognition confidence score        |
|  `segment_id`  |     string     |    Stable unique ID for speech segment     |

### Segment Rule

Partial and final results of identical speech segment share one `segment_id`. Time timeline keeps continuous after reconnection with same `session_id`.

### 7.3 Error

```
{
  "type": "error",
  "code": "INVALID_START",
  "message": "first message must have type=start",
  "fatal": true
}
```

### Error Code List

|          Code           |              Meaning              |   Client Handling Suggestion    |
| :---------------------: | :-------------------------------: | :-----------------------------: |
|      INVALID_TOKEN      |     Invalid or missing token      |   Refresh token and reconnect   |
|      INVALID_START      |   Illegal initial start message   |    Correct payload and retry    |
|      INVALID_JSON       |       Malformed JSON format       |      Fix message structure      |
|     UNKNOWN_CONTROL     |      Undefined command type       |  Use only start/stop/keepalive  |
| UPSTREAM_SESSION_FAILED | Backend translation service error | Retry later or check server log |
|     INTERNAL_ERROR      |     Server internal exception     |     Check log and reconnect     |

Re-establish connection when `fatal` equals true.

------

## 8. Reconnection Mechanism

Reconnect with identical `session_id` after unexpected disconnection.

Reconnection Steps

1. Create new WebSocket connection using original session ID
2. Authenticate with valid token
3. Send start message with same session ID
4. Wait for ready signal
5. Resume audio transmission

### Preserved Data

Continuous segment ID sequence; consistent time timeline

### Not Supported

Offline audio replay; state recovery after service reboot without extra persistence deployment

------

## 9. Test & Troubleshooting

Run local authentication test script

bash

```
.venv/bin/python scripts/auth_callback_probe.py
```

Test Process

1. Send POST login request
2. Parse token from response
3. Establish WebSocket connection with bearer token
4. Deliver start command
5. Await ready feedback

### Common Server Log Reference

|            Log Content            |               Explanation               |
| :-------------------------------: | :-------------------------------------: |
|       ws connection opened        |      WebSocket connection accepted      |
|           ws auth input           | Token extracted, authentication pending |
| auth callback response status=200 |          Authentication passed          |
|         ws start received         | Start configuration parsed successfully |
|       ws upstream connected       |  Backend translation service connected  |
|      ws connection finished       |         Session closed normally         |

Security Note: Only token length and partial characters are logged, full token will not be exposed.

------

## 10. Production Checklist

-  Stable connection to WSS endpoint
-  Valid token delivery via header or URL parameter
-  Invalid token returns corresponding error code
-  Ready response received after valid start command
-  No audio transmission before ready notification
-  Normal transcript output with supported audio formats
-  Stable segment ID for continuous speech
-  Progressive timestamp in one session
-  Consistent behavior after reconnection
-  WebSocket upgrade headers reserved with proxy buffering disabled

------

## 11. Nginx Reverse Proxy Configuration

nginx

```
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location /v1/translate/stream {
        proxy_pass http://backend_translation_service;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
}
```