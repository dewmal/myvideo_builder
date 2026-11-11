#!/usr/bin/env python3
"""Small local HTTP wrapper around Qwen3-TTS VoiceDesign inference."""

import io
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel


MODEL_ID = os.environ.get(
    "QWEN_TTS_MODEL",
    # "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
      "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
)
HOST = os.environ.get("QWEN_TTS_HOST", "127.0.0.1")
PORT = int(os.environ.get("QWEN_TTS_PORT", "8091"))
MAX_BODY_BYTES = 1_000_000
MAX_TEXT_LENGTH = 10_000
MAX_INSTRUCTION_LENGTH = 1_000
ALLOWED_LANGUAGES = {
    "Auto", "Chinese", "English", "German", "Italian", "Japanese",
    "Korean", "Portuguese", "Russian", "Spanish", "French",
}


def load_model():
    if torch.cuda.is_available():
        device_map = "cuda:0"
        dtype = torch.bfloat16
        print("Loading Qwen3-TTS on CUDA (bfloat16)", flush=True)
    else:
        # The official runtime supports CPU device placement. It is a portable
        # fallback, though generation will be much slower than on a CUDA GPU.
        device_map = "cpu"
        dtype = torch.float32
        print("CUDA was not found; loading Qwen3-TTS on CPU", flush=True)

    print(f"Loading {MODEL_ID}; first launch downloads model files if needed", flush=True)
    return Qwen3TTSModel.from_pretrained(
        MODEL_ID,
        device_map=device_map,
        dtype=dtype,
        attn_implementation="sdpa",
    )


MODEL = load_model()


class TTSHandler(BaseHTTPRequestHandler):
    def send_json(self, status, message):
        data = json.dumps({"error": message}).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path != "/health":
            self.send_json(404, "Not found")
            return
        data = json.dumps({"ok": True, "model": MODEL_ID}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/v1/audio/speech":
            self.send_json(404, "Not found")
            return

        try:
            body_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, "Invalid Content-Length")
            return
        if body_length <= 0 or body_length > MAX_BODY_BYTES:
            self.send_json(413, "Request body is empty or too large")
            return

        try:
            payload = json.loads(self.rfile.read(body_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, "Request body must be valid JSON")
            return

        text = payload.get("input", "") if isinstance(payload, dict) else ""
        language = payload.get("language", "Auto") if isinstance(payload, dict) else "Auto"
        instructions = payload.get("instructions", "") if isinstance(payload, dict) else ""
        if not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT_LENGTH:
            self.send_json(400, f"input is required and limited to {MAX_TEXT_LENGTH} characters")
            return
        if not isinstance(language, str) or language not in ALLOWED_LANGUAGES:
            self.send_json(400, "Unsupported language")
            return
        if not isinstance(instructions, str) or len(instructions) > MAX_INSTRUCTION_LENGTH:
            self.send_json(400, f"instructions are limited to {MAX_INSTRUCTION_LENGTH} characters")
            return

        try:
            wavs, sample_rate = MODEL.generate_voice_design(
                text=text.strip(),
                language=language,
                instruct=instructions.strip() or "A clear, natural speaking voice.",
            )
            audio_file = io.BytesIO()
            sf.write(audio_file, wavs[0], sample_rate, format="WAV")
            audio = audio_file.getvalue()
        except Exception as error:  # Return inference errors to the app as JSON.
            print(f"Qwen3-TTS inference failed: {error}", flush=True)
            self.send_json(500, str(error)[:500])
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Disposition", 'attachment; filename="qwen3-narration.wav"')
        self.send_header("Content-Length", str(len(audio)))
        self.end_headers()
        self.wfile.write(audio)

    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}", flush=True)


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), TTSHandler)
    print(f"Qwen3-TTS service ready at http://{HOST}:{PORT}", flush=True)
    server.serve_forever()
