import pickle
import sqlite3
import hashlib
import secrets
import numpy as np
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, session

# ============================================================
# DOCTOR LOGIN CREDENTIALS (change these!)
# ============================================================
DOCTOR_USERNAME = 'admin'
DOCTOR_PASSWORD = 'cardio123'  # Change this to your own password
# ============================================================

# --- Load Model ---
with open('model.pkl', 'rb') as f:
    bundle = pickle.load(f)

PIPELINE = bundle['pipeline']
FEATURES = bundle['features']
CATEGORICAL_MAPS_API = {
    'sex':     {'male': 1, 'female': 0},
    'cp':      {'typical angina': 0, 'atypical angina': 1,
                'non-anginal': 2, 'asymptomatic': 3},
    'fbs':     {'1': 1, '0': 0, 'true': 1, 'false': 0},
    'restecg': {'normal': 0, 'st-t abnormality': 1, 'lv hypertrophy': 2},
    'exang':   {'1': 1, '0': 0, 'true': 1, 'false': 0},
    'slope':   {'upsloping': 0, 'flat': 1, 'downsloping': 2},
    'thal':    {'normal': 0, 'fixed defect': 1, 'reversable defect': 2},
}
print('Model loaded.')

# --- SQLite Database ---
DB_PATH = 'patients.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT NOT NULL,
            patient_phone TEXT,
            age REAL, sex TEXT, cp TEXT,
            trestbps REAL, chol REAL, fbs TEXT,
            restecg TEXT, thalch REAL, exang TEXT,
            oldpeak REAL, slope TEXT, ca TEXT, thal TEXT,
            probability REAL, risk_level TEXT,
            created_at TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print('Database ready (patients.db)')

init_db()

def save_patient(data, probability, risk_level):
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        INSERT INTO patients
        (patient_name, patient_phone, age, sex, cp, trestbps, chol,
         fbs, restecg, thalch, exang, oldpeak, slope, ca, thal,
         probability, risk_level, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (
        data.get('patient_name', ''),
        data.get('patient_phone', ''),
        data.get('age'), data.get('sex'), data.get('cp'),
        data.get('trestbps'), data.get('chol'), data.get('fbs'),
        data.get('restecg'), data.get('thalch'), data.get('exang'),
        data.get('oldpeak'), data.get('slope'), data.get('ca'),
        data.get('thal'), probability, risk_level,
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()

def get_all_patients():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT * FROM patients ORDER BY id DESC').fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_patient_by_id(pid):
    conn = sqlite3.connect(DB_PATH)
    conn.execute('DELETE FROM patients WHERE id = ?', (pid,))
    conn.commit()
    conn.close()

# --- Flask App ---
app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = secrets.token_hex(32)

def parse_input(data):
    row = []
    for feat in FEATURES:
        raw = data.get(feat, None)
        if feat in CATEGORICAL_MAPS_API:
            key = str(raw).lower().strip() if raw is not None else ''
            val = CATEGORICAL_MAPS_API[feat].get(key)
            row.append(float(val) if val is not None else np.nan)
        else:
            try:
                row.append(float(raw))
            except (TypeError, ValueError):
                row.append(np.nan)
    return np.array(row, dtype=float).reshape(1, -1)

def require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated

# --- Auth Routes ---
@app.route('/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if username == DOCTOR_USERNAME and password == DOCTOR_PASSWORD:
        session['authenticated'] = True
        session['user'] = username
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

@app.route('/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/auth/status', methods=['GET'])
def auth_status():
    return jsonify({'authenticated': session.get('authenticated', False)})

# --- Page Routes ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({'error': 'Invalid JSON body'}), 400
    try:
        X = parse_input(data)
    except Exception as e:
        return jsonify({'error': f'Input parsing error: {str(e)}'}), 422
    try:
        proba = PIPELINE.predict_proba(X)[0, 1]
        percentage = round(float(proba) * 100, 1)
    except Exception as e:
        return jsonify({'error': f'Prediction error: {str(e)}'}), 500
    risk_level = 'Low' if percentage < 30 else ('Moderate' if percentage < 60 else 'High')
    try:
        save_patient(data, percentage, risk_level)
    except Exception as e:
        print(f'DB save error: {e}')
    return jsonify({'probability': percentage, 'risk_level': risk_level})

@app.route('/patients', methods=['GET'])
@require_auth
def list_patients():
    return jsonify({'patients': get_all_patients()})

@app.route('/patients/<int:patient_id>', methods=['DELETE'])
@require_auth
def remove_patient(patient_id):
    try:
        delete_patient_by_id(patient_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Start Server ---
print()
print('Starting Flask server on http://127.0.0.1:5000')
print(f'Login credentials -> Username: {DOCTOR_USERNAME} | Password: {DOCTOR_PASSWORD}')
print('Press Stop/Interrupt kernel to shut down.')
port = int(os.environ.get('PORT', 5000))
app.run(debug=False, host='0.0.0.0', port=port, use_reloader=False)
