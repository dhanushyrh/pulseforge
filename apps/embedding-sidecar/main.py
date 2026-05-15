# apps/embedding-sidecar/main.py
from fastapi import FastAPI, HTTPException
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
summarizer = None
summarizer_error = None
try:
    summarizer = pipeline(
        "text-generation",
        model    = "Qwen/Qwen2.5-0.5B-Instruct",   # ~1GB, runs on CPU
        device   = -1,                               # -1 = CPU
        max_new_tokens = 300,
    )
except Exception as e:
    summarizer_error = str(e)

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
class ClassifyRequest(BaseModel):
    text: str
class InsightsRequest(BaseModel):
    text: str
    country: str = ""
    content_type: str = ""

class OcrRequest(BaseModel):
    video_path: str
    sample_interval_sec: float = 2.0
    roi_start: float = 0.0   # 0.0 = full frame; travel text appears anywhere


@app.post("/classify")
def classify_travel(req: ClassifyRequest):
    import json, re

    prompt = f"""You are a travel content classifier.

Given the text below from a social media video, determine if it is travel-related content.

Travel content includes: destination guides, travel vlogs, food tours in foreign cities, hotel/accommodation reviews, flight experiences, packing tips, visa guides, itineraries, country/city exploration.

NOT travel content: fitness, fashion, cooking at home, relationships, politics, gaming, music, general lifestyle with no travel destination.

Text:
{req.text[:1500]}

Respond ONLY with valid JSON:
{{"is_travel": true or false, "confidence": 0.0 to 1.0, "reason": "one sentence"}}"""

    try:
        output = summarizer(
            prompt,
            do_sample=False,
            max_new_tokens=80,
        )[0]["generated_text"]

        match = re.search(r'\{{.*?\}}', output, re.DOTALL)
        if match:
            result = json.loads(match.group())
            return {
                "is_travel":  bool(result.get("is_travel", False)),
                "confidence": float(result.get("confidence", 0.5)),
                "reason":     str(result.get("reason", "")),
                "source":     "llm",
            }
    except Exception as e:
        pass

    # Fallback — simple keyword check
    travel_keywords = ["travel", "destination", "hotel", "flight", "tour", "visit", "explore", "trip", "country", "city", "food", "restaurant", "vlog"]
    hits = sum(1 for kw in travel_keywords if kw in req.text.lower())
    confidence = min(hits / 5.0, 1.0)
    return {
        "is_travel":  confidence >= 0.4,
        "confidence": round(confidence, 2),
        "reason":     f"keyword fallback ({hits} hits)",
        "source":     "fallback",
    }


@app.post("/extract-insights")
def extract_insights(req: InsightsRequest):
    import json, re

    prompt = f"""You are a travel content analyst. Extract structured travel information from this video transcript.

Country context: {req.country or "unknown"}
Content type: {req.content_type or "unknown"}

Transcript:
{req.text[:3000]}

Extract and return ONLY valid JSON with these fields (use empty arrays [] if not mentioned):
{{
  "stays": [
    {{"name": "hotel name", "location": "area/city", "pricePerNight": "price or null", "type": "hotel|hostel|airbnb|resort|other", "notes": "any notes or null"}}
  ],
  "places": [
    {{"name": "place name", "category": "landmark|neighborhood|attraction|viewpoint|other", "notes": "description or null", "mustVisit": true or false}}
  ],
  "food": [
    {{"name": "dish name", "restaurant": "restaurant name or null", "price": "price or null", "rating": "creator rating or null", "notes": "notes or null"}}
  ],
  "budget": [
    {{"category": "accommodation|food|transport|activities|shopping|other", "amount": "numeric amount", "currency": "JPY|USD|EUR|THB etc", "notes": "notes or null"}}
  ],
  "itinerary": [
    {{
      "day": 1,
      "title": "day title or null",
      "stops": [
        {{"time": "time or null", "description": "what to do", "place": "place name or null"}}
      ]
    }}
  ],
  "currency": "primary currency used (JPY/USD/EUR/THB etc)",
  "hasItinerary": true or false
}}

Return ONLY the JSON object, no markdown, no explanation."""

    try:
        output = summarizer(
            prompt,
            do_sample=False,
            max_new_tokens=600,
        )[0]["generated_text"]

        # Extract JSON from output
        match = re.search(r'\{.*\}', output, re.DOTALL)
        if match:
            result = json.loads(match.group())
            return result
    except Exception as e:
        pass

    # Return empty structure on failure
    return {
        "stays": [], "places": [], "food": [],
        "budget": [], "itinerary": [],
        "currency": None, "hasItinerary": False
    }

@app.post("/ocr-frames")
def ocr_frames(req: OcrRequest):
    import cv2, os, platform, tempfile
    from rapidfuzz import fuzz

    if platform.system() == "Darwin":
        import Vision
        from Foundation import NSURL
        def _ocr_image(img_path: str) -> str:
            url     = NSURL.fileURLWithPath_(img_path)
            handler = Vision.VNImageRequestHandler.alloc().initWithURL_options_(url, {})
            request = Vision.VNRecognizeTextRequest.alloc().init()
            request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
            request.setUsesLanguageCorrection_(True)
            handler.performRequests_error_([request], None)
            lines = []
            for obs in (request.results() or []):
                cands = obs.topCandidates_(1)
                if cands and cands[0].confidence() > 0.3:
                    lines.append(cands[0].string())
            return " ".join(lines).strip()
    else:
        import pytesseract
        from PIL import Image as _Image
        def _ocr_image(img_path: str) -> str:
            return pytesseract.image_to_string(
                _Image.open(img_path), config="--psm 6"
            ).strip()

    cap = cv2.VideoCapture(req.video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail=f"Cannot open video: {req.video_path}")

    fps      = cap.get(cv2.CAP_PROP_FPS) or 25
    interval = max(1, int(fps * req.sample_interval_sec))
    results, seen, frame_n = [], [], 0
    tmp = tempfile.mkdtemp()

    try:
        while cap.isOpened():
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_n)
            ok, frame = cap.read()
            if not ok:
                break
            h, w       = frame.shape[:2]
            roi        = frame[int(h * req.roi_start):h, 0:w]
            frame_path = os.path.join(tmp, f"frame_{frame_n}.jpg")
            cv2.imwrite(frame_path, roi)
            text = _ocr_image(frame_path)
            os.unlink(frame_path)
            if text and not any(fuzz.ratio(text, s) > 80 for s in seen[-5:]):
                seen.append(text)
                results.append({"ts": round(frame_n / fps, 2), "text": text})
            frame_n += interval
    finally:
        cap.release()
        os.rmdir(tmp)

    combined = " | ".join(r["text"] for r in results)
    return { "texts": results, "combined": combined, "count": len(results) }


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
    if summarizer is None:
        raise HTTPException(status_code=503, detail={"error": "summarizer unavailable", "reason": summarizer_error})

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