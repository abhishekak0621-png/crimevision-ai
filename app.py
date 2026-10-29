"""
CrimeVision AI - Intelligent Multimodal Forensic Analysis Platform
Flask REST API & Forensic Intelligence Server
"""

import os
import json
import hashlib
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template_string
from flask_cors import CORS

from models.object_detector import ObjectDetector
from models.audio_analyzer import AudioForensicAnalyzer
from models.timeline_fusion import TimelineFusionEngine
from models.forensic_rag import ForensicRAGChat
from models.report_generator import ForensicReportGenerator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "sample_cases.json")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

# Initialize Forensic Intelligence Engines
detector = ObjectDetector()
audio_analyzer = AudioForensicAnalyzer()
fusion_engine = TimelineFusionEngine()
rag_chat = ForensicRAGChat()
report_gen = ForensicReportGenerator()

def load_cases_db():
    if not os.path.exists(DATA_FILE):
        return {"cases": []}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_cases_db(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")

@app.route("/api/cases", methods=["GET"])
def get_cases():
    db = load_cases_db()
    summaries = []
    for c in db.get("cases", []):
        summaries.append({
            "id": c["id"],
            "title": c["title"],
            "incident_type": c["incident_type"],
            "status": c["status"],
            "priority": c["priority"],
            "date": c["date"],
            "evidence_count": len(c.get("evidence_items", [])),
            "timeline_events": len(c.get("chronological_timeline", [])),
            "lead_investigator": c.get("lead_investigator")
        })
    return jsonify({"status": "success", "cases": summaries})

@app.route("/api/cases/<case_id>", methods=["GET"])
def get_case_detail(case_id):
    db = load_cases_db()
    case = next((c for c in db.get("cases", []) if c["id"] == case_id), None)
    if not case:
        return jsonify({"status": "error", "message": "Case not found"}), 404
    
    # Enrich with fused timeline and correlation insights
    fused_timeline = fusion_engine.build_fused_timeline(case)
    correlations = fusion_engine.detect_correlations_and_conflicts(case)
    
    response_data = dict(case)
    response_data["fused_timeline"] = fused_timeline
    response_data["correlations"] = correlations
    return jsonify({"status": "success", "case": response_data})

@app.route("/api/cases/<case_id>/query", methods=["POST"])
def query_case_ai(case_id):
    db = load_cases_db()
    case = next((c for c in db.get("cases", []) if c["id"] == case_id), None)
    if not case:
        return jsonify({"status": "error", "message": "Case not found"}), 404

    payload = request.get_json() or {}
    user_prompt = payload.get("query", "")
    history = payload.get("history", [])

    if not user_prompt:
        return jsonify({"status": "error", "message": "Empty query"}), 400

    result = rag_chat.query(user_prompt, case, history)
    return jsonify({"status": "success", "data": result})

@app.route("/api/cases/<case_id>/evidence/upload", methods=["POST"])
def upload_evidence(case_id):
    db = load_cases_db()
    case = next((c for c in db.get("cases", []) if c["id"] == case_id), None)
    if not case:
        return jsonify({"status": "error", "message": "Case not found"}), 404

    # Check for file or simulated upload
    title = request.form.get("title", "Forensic Capture Stream")
    modality = request.form.get("modality", "cctv_frame")
    
    file = request.files.get("file")
    filename = "uploaded_evidence.jpg"
    file_bytes = b"forensic_sample_data"
    
    if file:
        filename = file.filename
        file_bytes = file.read()
        save_path = os.path.join(STATIC_DIR, "assets", filename)
        with open(save_path, "wb") as f_out:
            f_out.write(file_bytes)
        file_url = f"/static/assets/{filename}"
    else:
        file_url = "/static/assets/cctv_vault.jpg"

    sha256_hash = hashlib.sha256(file_bytes).hexdigest()
    new_ev_id = f"EV-{len(case.get('evidence_items', [])) + 1:03d}"
    
    # Process through multimodal AI detector
    if modality in ["cctv_frame", "crime_scene_photo", "image", "video"]:
        detections = detector.analyze_image(file_url, filename=filename)
        new_item = {
            "id": new_ev_id,
            "type": modality,
            "title": title,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "Investigator Upload / Sensor Terminal",
            "file_url": file_url,
            "hash_sha256": sha256_hash,
            "detections": detections
        }
    else:
        # Audio modality
        audio_res = audio_analyzer.analyze_audio(file_url, filename=filename)
        new_item = {
            "id": new_ev_id,
            "type": "audio",
            "title": title,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "Digital Dispatch / 911 Trunk Recorder",
            "file_url": "/static/assets/witness_call_911.wav",
            "hash_sha256": sha256_hash,
            "duration_sec": audio_res["duration_sec"],
            "acoustic_stress_score": audio_res["acoustic_stress_score"],
            "transcripts": audio_res["transcripts"]
        }

    case.setdefault("evidence_items", []).append(new_item)
    
    # Add chain of custody record
    coc_entry = {
        "log_id": f"COC-{len(case.get('chain_of_custody', [])) + 900:03d}",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "officer": "Duty Examiner (CrimeVision Terminal)",
        "action": f"Ingested evidence item {new_ev_id} ({modality}) with SHA-256 seal",
        "status": "VERIFIED"
    }
    case.setdefault("chain_of_custody", []).append(coc_entry)

    save_cases_db(db)
    return jsonify({"status": "success", "evidence_item": new_item})

@app.route("/api/cases/<case_id>/report", methods=["GET"])
def get_report(case_id):
    db = load_cases_db()
    case = next((c for c in db.get("cases", []) if c["id"] == case_id), None)
    if not case:
        return "Case not found", 404
    html = report_gen.generate_html_report(case)
    return html

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "system": "CrimeVision AI Multimodal Forensic Analysis Platform",
        "version": "4.2.0-LTS",
        "ai_engines": {
            "computer_vision": "YOLO-v11 / Vision-Transformer Ensemble (Active)",
            "audio_forensics": "Whisper-Forensic / Acoustic Stress Analyzer (Active)",
            "timeline_fusion": "Multimodal Cross-Attention Temporal Aligner (Active)",
            "rag_assistant": "Forensic-LLM Context Engine (Active)"
        }
    })

if __name__ == "__main__":
    print("================================================================")
    print("  CrimeVision AI - Intelligent Multimodal Forensic Analysis Platform")
    print("  REST API & Forensic Cockpit Running at: http://127.0.0.1:5000")
    print("================================================================")
    app.run(host="0.0.0.0", port=5000, debug=False)
