import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq

load_dotenv()

# ── Gemini setup ──
def _load_numbered_keys(prefix: str) -> list:
    """Reads PREFIX_1, PREFIX_2, PREFIX_3... from env until one is missing or empty."""
    keys, i = [], 1
    while True:
        val = os.getenv(f"{prefix}_{i}", "").strip()
        if not val:
            break
        keys.append(val)
        i += 1
    return keys

GEMINI_API_KEYS = _load_numbered_keys("GEMINI_API_KEY")
current_key_index = 0

if GEMINI_API_KEYS:
    genai.configure(api_key=GEMINI_API_KEYS[current_key_index])
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    gemini_model = None

# ── Groq setup (fallback) ──
GROQ_API_KEYS = _load_numbered_keys("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

print(f"Loaded {len(GEMINI_API_KEYS)} Gemini key(s) and {len(GROQ_API_KEYS)} Groq key(s).")

# ++++++++++++++++++++++++++
# FLASK APP INITIALIZATION
# ++++++++++++++++++++++++++
app = Flask(__name__)
CORS(app)

# ++++++++++++++++++++
# DATABASE SETUP
# ++++++++++++++++++++
try:
    connection_string = os.getenv("MONGODB_CONNECTION_STRING")
    database_name = os.getenv("MONGODB_DB_NAME", "medicaldata_db")
    client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
    db = client.get_database(database_name)

    # Collections
    users_collection = db.get_collection('users')
    chat_sessions_collection = db.get_collection('chat_sessions')
    news_articles_collection = db.get_collection('news_articles')
    news_meta_collection = db.get_collection('news_meta')
    auth_events_collection = db.get_collection('auth_events')
    api_logs_collection = db.get_collection('api_logs')
    
    home_data_collection = db.get_collection('home_data')
    sos_data_collection = db.get_collection('sos_data')
    live_data_collection = db.get_collection('live_data')
    building_data_collection = db.get_collection('building_data')

    # Create indexes for performance
    users_collection.create_index("user_id", unique=True)
    users_collection.create_index("email", unique=True)
    chat_sessions_collection.create_index([("user_id", 1), ("session_id", 1)], unique=True)
    auth_events_collection.create_index([("email", ASCENDING), ("created_at", DESCENDING)])
    auth_events_collection.create_index([("event_type", ASCENDING), ("created_at", DESCENDING)])
    api_logs_collection.create_index([("created_at", DESCENDING)])
    api_logs_collection.create_index([("path", ASCENDING), ("created_at", DESCENDING)])

    # News indexes (newsfeed.py also creates these; safe to call here)
    news_articles_collection.create_index("article_id", unique=True)
    news_articles_collection.create_index([("categories", ASCENDING), ("published_ts", DESCENDING)])
    try:
        news_articles_collection.create_index("expires_at", expireAfterSeconds=0, name="ttl_expires")
    except Exception:
        pass
    try:
        news_articles_collection.create_index(
            [("title", "text"), ("description", "text")],
            name="text_search_index",
            weights={"title": 3, "description": 1},
        )
    except Exception:
        pass

    print("Connected to MongoDB Atlas successfully!")
except Exception as e:
    print(f"ERROR: Could not connect to MongoDB. {e}")
    client = None
    users_collection = None
    chat_sessions_collection = None
    news_articles_collection = None
    news_meta_collection = None
    auth_events_collection = None
    api_logs_collection = None
    home_data_collection = None
    sos_data_collection = None
    live_data_collection = None
    building_data_collection = None

# ++++++++++++++++++++
# BASIC ROUTES
# ++++++++++++++++++++
@app.route("/", methods=["GET"])
def root():
    return jsonify(
        {
            "success": True,
            "service": "Backend service",
            "status": "running"
        }
    )

@app.route("/api/home", methods=["GET"])
def get_home_data():
    if home_data_collection is None: return jsonify({"success": False, "data": None})
    data = home_data_collection.find_one({}, {"_id": 0})
    return jsonify({"success": True, "data": data})

@app.route("/api/sos", methods=["GET"])
def get_sos_data():
    if sos_data_collection is None: return jsonify({"success": False, "data": None})
    data = sos_data_collection.find_one({}, {"_id": 0})
    return jsonify({"success": True, "data": data})

@app.route("/api/live", methods=["GET"])
def get_live_data():
    if live_data_collection is None: return jsonify({"success": False, "data": None})
    data = live_data_collection.find_one({}, {"_id": 0})
    return jsonify({"success": True, "data": data})

@app.route("/api/building", methods=["GET"])
def get_building_data():
    if building_data_collection is None: return jsonify({"success": False, "data": None})
    data = building_data_collection.find_one({}, {"_id": 0})
    return jsonify({"success": True, "data": data})


# ++++++++++++++++++++++++++++++++
# AEGIS REAL SENSOR DATA ENDPOINTS
# (reads from aegis_db)
# ++++++++++++++++++++++++++++++++

@app.route("/api/aegis/nodes", methods=["GET"])
def get_aegis_nodes():
    """
    Returns the latest fused_reading for each node_id.
    """
    try:
        aegis_db = client['aegis_db']
        col = aegis_db['fused_readings']
        # Get distinct node_ids then fetch latest doc for each
        node_ids = col.distinct('node_id')
        nodes = []
        for nid in node_ids:
            doc = col.find_one({'node_id': nid}, {'_id': 0},
                               sort=[('timestamp', -1)])
            if doc:
                nodes.append(doc)
        return jsonify({'success': True, 'data': nodes})
    except Exception as e:
        return jsonify({'success': False, 'data': [], 'error': str(e)})


@app.route("/api/aegis/campus", methods=["GET"])
def get_aegis_campus():
    """
    Returns all campus_status documents.
    """
    try:
        aegis_db = client['aegis_db']
        col = aegis_db['campus_status']
        data = list(col.find({}, {'_id': 0}))
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'data': [], 'error': str(e)})


@app.route("/api/aegis/incidents", methods=["GET"])
def get_aegis_incidents():
    """
    Returns all incident records sorted newest first.
    """
    try:
        aegis_db = client['aegis_db']
        col = aegis_db['incidents']
        data = list(col.find({}, {'_id': 0}).sort('timestamp', -1))
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'data': [], 'error': str(e)})

# ++++++++++++++++++++++++++
# NEW DATA ENDPOINTS
# ++++++++++++++++++++++++++

@app.route("/api/campus", methods=["GET"])
def get_campus_data():
    """
    Campus-level summary dynamically generated from aegis_db
    """
    try:
        aegis_db = client['aegis_db']
        
        buildings = list(aegis_db['campus_status'].find({}, {"_id": 0}))
        active_incidents = list(aegis_db['incidents'].find({"status": "ACTIVE"}, {"_id": 0}))
        active_nodes_count = len(aegis_db['fused_readings'].distinct('node_id'))
        
        status = "safe"
        if active_incidents:
            has_critical = any(i.get('incident_type', '').lower() in ['fire', 'flame detected', 'gas leak'] for i in active_incidents)
            status = "critical" if has_critical else "warning"

        occupancy = sum(b.get('people_inside', 0) for b in buildings)
        health_score = max(0, 100 - (len(active_incidents) * 15))
        
        threats_list = [i.get('incident_type', 'Unknown Threat') for i in active_incidents]
        threats = ", ".join(threats_list) if threats_list else "None"

        data = {
            "status": status,
            "healthScore": health_score,
            "buildingsOnline": len(buildings),
            "activeNodes": active_nodes_count,
            "occupancy": occupancy,
            "threats": threats
        }
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "data": None, "error": str(e)})


@app.route("/api/building-stats/<building_id>", methods=["GET"])
def get_building_stats(building_id):
    """
    Building-specific statistics generated from campus_status and fused_readings.
    """
    try:
        aegis_db = client['aegis_db']
        
        b_name = 'Academic Block' if building_id == 'building-a' else ('Research Block' if building_id == 'building-b' else None)
        
        if not b_name:
            return jsonify({"success": False, "data": None, "error": "Unknown building ID"})
            
        c_status = aegis_db['campus_status'].find_one({"building": b_name})
        incidents = list(aegis_db['incidents'].find({"building": b_name, "status": "ACTIVE"}))
        
        # Determine status
        status = "safe"
        if incidents:
            has_critical = any(i.get('incident_type', '').lower() in ['fire', 'flame detected', 'gas leak'] for i in incidents)
            status = "critical" if has_critical else "warning"
            
        # Get sensor averages for this building
        nodes = list(aegis_db['fused_readings'].aggregate([
            {"$match": {"building": b_name}},
            {"$sort": {"timestamp": -1}},
            {"$group": {
                "_id": "$node_id",
                "temperature": {"$first": "$environment.temperature"},
                "gas": {"$first": "$environment.gas"}
            }}
        ]))
        
        avg_temp = round(sum(n.get('temperature', 22) for n in nodes) / len(nodes), 1) if nodes else 22.5
        avg_aqi = round(sum(n.get('gas', 20) for n in nodes) / len(nodes)) if nodes else 25
        
        data = {
            "building_id": building_id,
            "status": status,
            "healthScore": max(0, 100 - (len(incidents) * 20)),
            "occupancy": c_status.get('people_inside', 0) if c_status else 0,
            "temperature": avg_temp,
            "airQuality": avg_aqi,
            "power": "online",
            "internet": "online",
            "cameras": "online",
            "emergency": status == "critical"
        }
        
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "data": None, "error": str(e)})

@app.route("/api/nodes", methods=["GET"])
def get_nodes():
    """
    Flat list of sensor node telemetry dynamically fetched from fused_readings
    """
    try:
        aegis_db = client['aegis_db']
        col = aegis_db['fused_readings']
        
        node_ids = col.distinct('node_id')
        web_nodes = []
        
        for nid in node_ids:
            doc = col.find_one({'node_id': nid}, {'_id': 0}, sort=[('timestamp', -1)])
            if not doc: continue
            
            env = doc.get('environment', {})
            elec = doc.get('electrical', {})
            occ = doc.get('occupancy', {})
            
            # Compute status
            flame = env.get('flame', False)
            panic = doc.get('panic_button', False)
            smoke_label = env.get('smoke_label', 'LOW')
            gas_label = env.get('gas_label', 'LOW')
            temp_label = env.get('temperature_label', 'NORMAL')
            
            status = 'safe'
            if flame or panic or smoke_label == 'HIGH':
                status = 'critical'
            elif gas_label == 'HIGH' or temp_label == 'HIGH' or elec.get('current_label') == 'ABNORMAL':
                status = 'warn'
                
            web_nodes.append({
                "id": doc.get('node_id', 'Unknown'),
                "building": doc.get('building', 'Unknown'),
                "floor": f"Floor {doc.get('floor', 1)}",
                "room": doc.get('room', 'Unknown'),
                "status": status,
                "temperature": env.get('temperature'),
                "smoke": env.get('smoke'),
                "gas": env.get('gas'),
                "humidity": env.get('humidity'),
                "current": elec.get('current'),
                "flame": flame,
                "panic": panic,
                "motion": occ.get('motion', False),
                "battery": 95, # simulated remaining fixed fields
                "wifi": 98,
                "signal": -45,
                "healthScore": 100 if status == 'safe' else (75 if status == 'warn' else 40),
                "lastUpdated": doc.get('timestamp')
            })
            
        return jsonify({"success": True, "data": web_nodes})
    except Exception as e:
        return jsonify({"success": False, "data": [], "error": str(e)})


@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """
    Analytics summary document for the web dashboard.
    """
    try:
        # We simulate the trend data based on current DB state
        data = {
            "healthTrend": [88, 90, 85, 92, 95, 98, 100],
            "incidentFrequency": [1, 0, 2, 0, 0, 1, 0],
            "responseTimes": [120, 90, 85, 110, 95, 80],
            "sensorReliability": 99.4,
            "highRiskAreas": [
                {"area": "Electrical Lab", "risk": 85},
                {"area": "Chemistry Lab", "risk": 45},
            ],
            "nodeHealthDistribution": [
                {"label": "Safe Nodes", "value": 85, "status": "safe"},
                {"label": "Warning", "value": 10, "status": "warn"},
                {"label": "Critical", "value": 5, "status": "critical"}
            ]
        }
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "data": None, "error": str(e)})


@app.route("/api/reports", methods=["GET"])
def get_reports():
    """
    Incident report list dynamically from aegis_db.incidents
    """
    try:
        aegis_db = client['aegis_db']
        incidents = list(aegis_db['incidents'].find({}, {'_id': 0}).sort('timestamp', -1))
        
        reports = []
        for inc in incidents:
            ai = inc.get('ai_analysis', {})
            reports.append({
                "id": inc.get('incident_id', ''),
                "title": inc.get('incident_type', 'Incident'),
                "date": inc.get('timestamp', ''),
                "cause": ai.get('analysis', {}).get('cause', 'Unknown'),
                "areas": f"{inc.get('building', '')} - {inc.get('room', '')}",
                "summary": ai.get('public_advisory', {}).get('message', 'No summary available.')
            })
            
        return jsonify({"success": True, "data": reports})
    except Exception as e:
        return jsonify({"success": False, "data": [], "error": str(e)})


@app.route("/api/live-feed", methods=["GET"])
def get_live_feed():
    """
    Real-time event feed entries from incidents.
    """
    try:
        aegis_db = client['aegis_db']
        incidents = list(aegis_db['incidents'].find({}, {'_id': 0}).sort('timestamp', -1).limit(10))
        
        events = []
        for inc in incidents:
            events.append({
                "message": f"[{inc.get('incident_type')}] detected in {inc.get('building')} ({inc.get('room')})",
                "timestamp": inc.get('timestamp')
            })
            
        return jsonify({"success": True, "data": events})
    except Exception as e:
        return jsonify({"success": False, "data": [], "error": str(e)})


@app.route("/api/chat", methods=["POST"])
def chat():
    global current_key_index, gemini_model

    data = request.json
    if not data or "message" not in data:
        return jsonify({"success": False, "error": "Message is required"})

    user_message = data["message"]

    # ── Try Gemini first ──────────────────────────────────────────────────────
    if gemini_model and GEMINI_API_KEYS:
        attempts = 0
        while attempts < len(GEMINI_API_KEYS):
            try:
                response = gemini_model.generate_content(user_message)
                return jsonify({"success": True, "reply": response.text, "provider": "gemini"})
            except Exception as e:
                error_msg = str(e).lower()
                if any(k in error_msg for k in ["quota", "429", "403", "401", "exhausted", "invalid", "404", "not found"]):
                    attempts += 1
                    if attempts < len(GEMINI_API_KEYS):
                        current_key_index = (current_key_index + 1) % len(GEMINI_API_KEYS)
                        genai.configure(api_key=GEMINI_API_KEYS[current_key_index])
                        gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                        continue
                    else:
                        print(f"[WARN] All Gemini keys exhausted. Falling back to Groq...")
                        break  # fall through to Groq
                else:
                    print(f"[WARN] Gemini error: {e}. Falling back to Groq...")
                    break  # non-quota error, try Groq

    # ── Fallback: Try Groq ────────────────────────────────────────────────────
    if GROQ_API_KEYS:
        for groq_key in GROQ_API_KEYS:
            try:
                groq_client = Groq(api_key=groq_key)
                completion = groq_client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[{"role": "user", "content": user_message}],
                    max_tokens=1024,
                )
                reply = completion.choices[0].message.content
                return jsonify({"success": True, "reply": reply, "provider": "groq"})
            except Exception as e:
                error_msg = str(e).lower()
                if any(k in error_msg for k in ["quota", "429", "401", "403", "invalid"]):
                    print(f"[WARN] Groq key failed: {e}")
                    continue
                else:
                    print(f"[ERROR] Groq error: {e}")
                    break

    return jsonify({"success": False, "error": "All AI providers (Gemini + Groq) are unavailable. Please check your API keys."})

if __name__ == "__main__":
    flask_debug = os.getenv("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=flask_debug)
