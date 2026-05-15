# apps/embedding-sidecar/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, pipeline
from huggingface_hub import hf_hub_download
import onnxruntime as ort
import numpy as np
import uvicorn

app = FastAPI(title="PulseForge Embedding Sidecar")

# ── Embedding model ──────────────────────────────────────────
MODEL_ID  = "sentence-transformers/all-MiniLM-L6-v2"
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

onnx_path = hf_hub_download(repo_id=MODEL_ID, filename="onnx/model.onnx")
session   = ort.InferenceSession(onnx_path)

# ── Summarization pipeline (lightweight, CPU) ────────────────
summarizer = pipeline(
    "text-generation",
    model    = "Qwen/Qwen2.5-0.5B-Instruct",   # ~1GB, runs on CPU
    device   = -1,                               # -1 = CPU
    max_new_tokens = 300,
)

# ── Helpers ──────────────────────────────────────────────────
def mean_pooling(token_embeddings, attention_mask):
    mask_expanded  = attention_mask[:, :, np.newaxis].astype(float)
    sum_embeddings = np.sum(token_embeddings * mask_expanded, axis=1)
    sum_mask       = np.clip(mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
    return sum_embeddings / sum_mask

def normalize(v):
    norm = np.linalg.norm(v, axis=1, keepdims=True)
    return v / np.clip(norm, a_min=1e-9, a_max=None)

def encode(texts):
    encoded = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="np")
    outputs = session.run(None, {
        "input_ids":      encoded["input_ids"],
        "attention_mask": encoded["attention_mask"],
        "token_type_ids": encoded.get("token_type_ids", np.zeros_like(encoded["input_ids"])),
    })
    return normalize(mean_pooling(outputs[0], encoded["attention_mask"])).tolist()

# ── Routes ───────────────────────────────────────────────────
class EmbedRequest(BaseModel):
    text: str

class EmbedBatchRequest(BaseModel):
    texts: list[str]

class SummarizeRequest(BaseModel):
    prompt: str

@app.post("/embed")
def embed_single(req: EmbedRequest):
    vectors = encode([req.text])
    return { "embedding": vectors[0], "dim": len(vectors[0]) }

@app.post("/embed/batch")
def embed_batch(req: EmbedBatchRequest):
    vectors = encode(req.texts)
    return { "embeddings": vectors, "dim": len(vectors[0]) }

@app.post("/summarize")
def summarize(req: SummarizeRequest):
    import json, re
    output = summarizer(req.prompt, do_sample=False)[0]["generated_text"]

    # Extract JSON from model output
    try:
        match = re.search(r'\{.*\}', output, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass

    # Fallback if model doesn't return clean JSON
    return {
        "summary":   output[:200].strip(),
        "sentiment": "neutral",
        "entities":  [],
    }

@app.get("/health")
def health():
    return { "status": "ok", "model": MODEL_ID, "backend": "onnxruntime" }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)