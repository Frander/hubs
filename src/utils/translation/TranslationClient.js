import { TRANSLATION_WS_URL } from "./translation-config";
import { getTranslationToken } from "./translation-auth";

const MIME_OPUS_WEBM = "audio/webm;codecs=opus";
const CHUNK_MS = 100;
const AUDIO_BITRATE = 24000;
const BUFFERED_DROP_THRESHOLD = 1_000_000;

export class TranslationClient {
  constructor() {
    this.ws = null;
    this.recorder = null;
    this.destinationNode = null;
    this.listenerInput = null;
    this.audioContext = null;
    this.sessionId = null;
    this.state = "idle";
    this.onTranscript = null;
    this.onStatus = null;
    this.onError = null;
  }

  isActive() {
    return this.state !== "idle" && this.state !== "error";
  }

  async start({ sceneEl, sourceLang, targetLang, onTranscript, onStatus, onError }) {
    if (this.isActive()) {
      this.stop();
    }

    this.onTranscript = onTranscript;
    this.onStatus = onStatus;
    this.onError = onError;
    this._setState("connecting");

    try {
      const token = await getTranslationToken();
      this._setupAudioTap(sceneEl);
      this._openWebSocket(token, sourceLang, targetLang);
    } catch (err) {
      console.error("[TranslationClient] start failed:", err);
      this._reportError(err.message || String(err));
      this._cleanup();
    }
  }

  stop() {
    if (this.state === "idle") return;
    this._setState("closing");
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "stop" }));
      }
    } catch (e) {
      console.warn("[TranslationClient] error sending stop:", e);
    }
    this._cleanup();
  }

  _setupAudioTap(sceneEl) {
    this.audioContext = THREE.AudioContext.getContext();
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    if (!sceneEl || !sceneEl.audioListener) {
      throw new Error("Scene audio listener not available");
    }
    this.listenerInput = sceneEl.audioListener.getInput();
    this.destinationNode = this.audioContext.createMediaStreamDestination();
    this.listenerInput.connect(this.destinationNode);
  }

  _openWebSocket(token, sourceLang, targetLang) {
    this.sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const url = `${TRANSLATION_WS_URL}?session_id=${encodeURIComponent(
      this.sessionId
    )}&token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => this._sendStart(sourceLang, targetLang);
    this.ws.onmessage = ev => this._handleServerMessage(ev);
    this.ws.onerror = err => {
      console.error("[TranslationClient] WS error:", err);
      this._reportError("WebSocket error");
    };
    this.ws.onclose = () => {
      if (this.state !== "closing" && this.state !== "idle") {
        this._reportError("WebSocket closed unexpectedly");
      }
      this._cleanup();
    };
  }

  _sendStart(sourceLang, targetLang) {
    const startMsg = {
      type: "start",
      audio: {
        encoding: "opus-webm",
        sample_rate: 48000,
        channels: 1,
        bits: 16
      },
      source_lang: sourceLang,
      target_langs: [targetLang],
      interim_results: true,
      vad: true,
      session_id: this.sessionId,
      metadata: { client: "hubs" }
    };
    this.ws.send(JSON.stringify(startMsg));
  }

  _handleServerMessage(ev) {
    if (typeof ev.data !== "string") return;
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      console.warn("[TranslationClient] non-JSON message ignored");
      return;
    }
    switch (msg.type) {
      case "ready":
        this._setState("streaming");
        this._startRecording();
        break;
      case "transcript":
        this.onTranscript?.(msg);
        break;
      case "error":
        console.error("[TranslationClient] server error:", msg.code, msg.message);
        this._reportError(`${msg.code}: ${msg.message}`);
        if (msg.fatal) this._cleanup();
        break;
      case "pong":
        break;
      default:
        break;
    }
  }

  _startRecording() {
    if (!MediaRecorder.isTypeSupported(MIME_OPUS_WEBM)) {
      this._reportError("Browser does not support audio/webm;codecs=opus");
      this._cleanup();
      return;
    }
    const stream = this.destinationNode.stream;
    this.recorder = new MediaRecorder(stream, {
      mimeType: MIME_OPUS_WEBM,
      audioBitsPerSecond: AUDIO_BITRATE
    });
    this.recorder.ondataavailable = e => this._sendAudioChunk(e.data);
    this.recorder.start(CHUNK_MS);
  }

  _sendAudioChunk(blob) {
    if (!blob || blob.size === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.ws.bufferedAmount > BUFFERED_DROP_THRESHOLD) return;
    blob.arrayBuffer().then(buf => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(buf);
      }
    });
  }

  _reportError(message) {
    this._setState("error");
    this.onError?.(message);
  }

  _cleanup() {
    if (this.recorder) {
      try {
        if (this.recorder.state !== "inactive") this.recorder.stop();
      } catch {}
      this.recorder = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.destinationNode && this.listenerInput) {
      try {
        this.listenerInput.disconnect(this.destinationNode);
      } catch {}
    }
    this.destinationNode = null;
    this.listenerInput = null;
    this.sessionId = null;
    if (this.state !== "error") {
      this._setState("idle");
    }
  }

  _setState(s) {
    this.state = s;
    this.onStatus?.(s);
  }
}
