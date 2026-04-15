# ♥ CardioPulse AI — Heart Disease Risk Predictor

![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-2.x-black?logo=flask)
![Scikit-learn](https://img.shields.io/badge/Scikit--learn-ML-orange?logo=scikit-learn)
![License](https://img.shields.io/badge/License-MIT-green)

A full-stack AI-powered clinical web application that predicts heart disease risk from patient biometric data. Built with a trained machine learning pipeline, Flask REST API, SQLite database, and a modern responsive frontend.

---

## 🔍 Overview

CardioPulse AI allows healthcare professionals to:
- Enter 13 clinical parameters for a patient
- Instantly receive an ML-based heart disease risk score (Low / Moderate / High)
- Automatically save patient records to a local database
- View, search, and manage all patient history via a secure doctor login panel

> ⚠️ **Disclaimer:** This tool is for educational and research purposes only. It is not a substitute for professional medical diagnosis. Always consult a qualified healthcare provider for clinical decisions.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 ML Prediction | Random Forest pipeline trained on UCI Heart Disease dataset (ROC-AUC: 0.93) |
| 📋 Patient Form | 13 clinical input fields with validation |
| 💾 Auto-Save | Every prediction is automatically saved to SQLite |
| 🔐 Doctor Login | Session-based authentication to protect patient records |
| 📊 Patient History | Searchable table with risk stats (Low / Moderate / High counts) |
| 🗑️ Record Management | Delete individual patient records from the dashboard |
| 📱 Responsive UI | Works on desktop and mobile browsers |

---

## 🧠 ML Model

- **Dataset:** [UCI Heart Disease Dataset](https://archive.ics.uci.edu/ml/datasets/heart+Disease)
- **Algorithm:** Random Forest (Scikit-learn Pipeline)
- **Training Samples:** 920+
- **Features Used:** 13 clinical features
- **Performance:** ROC-AUC Score: **0.93**

### Input Features

| Feature | Description |
|---|---|
| `age` | Patient age in years |
| `sex` | Biological sex (male / female) |
| `cp` | Chest pain type (typical angina, atypical angina, non-anginal, asymptomatic) |
| `trestbps` | Resting blood pressure (mm Hg) |
| `chol` | Serum cholesterol (mg/dl) |
| `fbs` | Fasting blood sugar > 120 mg/dl (true / false) |
| `restecg` | Resting ECG results (normal, st-t abnormality, lv hypertrophy) |
| `thalch` | Maximum heart rate achieved (bpm) |
| `exang` | Exercise-induced angina (true / false) |
| `oldpeak` | ST depression induced by exercise |
| `slope` | Slope of the peak exercise ST segment |
| `ca` | Number of major vessels colored by fluoroscopy (0–3) |
| `thal` | Thalassemia (normal, fixed defect, reversable defect) |

### Risk Levels

| Risk % | Level |
|---|---|
| < 30% | 🟢 Low |
| 30% – 59% | 🟡 Moderate |
| ≥ 60% | 🔴 High |

---

## 🗂️ Project Structure

```
cardiopulse-ai/
│
├── index.html            # Frontend UI
├── style.css             # Styles
├── script.js             # Frontend logic
├── _run_server.py        # Flask backend + API
├── model.pkl             # Trained ML pipeline (not pushed to GitHub)
├── patients.db           # SQLite database (not pushed to GitHub)
├── heart_disease_uci.csv # Training dataset
├── macroproject.ipynb    # Model training notebook
├── requirements.txt      # Python dependencies
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- pip

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cardiopulse-ai.git
cd cardiopulse-ai
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Environment Variables

Never hardcode credentials. Set them in your environment:

**On Linux / macOS:**
```bash
export DOCTOR_USERNAME=admin
export DOCTOR_PASSWORD=your_secret_password
```

**On Windows (Command Prompt):**
```cmd
set DOCTOR_USERNAME=admin
set DOCTOR_PASSWORD=your_secret_password
```

**Or create a `.env` file** (never commit this file):
```
DOCTOR_USERNAME=admin
DOCTOR_PASSWORD=your_secret_password
```

### 4. Run the Server

```bash
python _run_server.py
```

Open your browser at: **http://127.0.0.1:5000**

---

## 🌐 Deployment (Render)

### Backend (Flask) → Render

1. Push your code to GitHub (**without** `model.pkl`, `patients.db`, `.env`)
2. Go to [render.com](https://render.com) → Create a new **Web Service**
3. Connect your GitHub repo
4. Set the **Start Command** to:
   ```
   python _run_server.py
   ```
5. Under **Environment**, add:
   | Key | Value |
   |---|---|
   | `DOCTOR_USERNAME` | your username |
   | `DOCTOR_PASSWORD` | your secure password |

### Frontend → GitHub Pages

If serving only static files (no backend), push `index.html`, `style.css`, `script.js` to GitHub Pages and point the API base URL in `script.js` to your Render backend URL.

---

## 🔒 Security

- Doctor login uses **Flask session-based authentication**
- Credentials are loaded from **environment variables** — never hardcoded
- Patient history endpoints are **protected** (`@require_auth` decorator)
- Add `.env`, `model.pkl`, `patients.db` to `.gitignore` before pushing

---

## 📦 Requirements

```
flask
numpy
scikit-learn
```

Install with:
```bash
pip install -r requirements.txt
```

---

## 📡 API Reference

### `POST /predict`
Accepts patient data JSON, returns risk probability.

**Request Body:**
```json
{
  "patient_name": "John Doe",
  "patient_phone": "+91 9876543210",
  "age": 54,
  "sex": "male",
  "cp": "typical angina",
  "trestbps": 130,
  "chol": 245,
  "fbs": "false",
  "restecg": "normal",
  "thalch": 150,
  "exang": "false",
  "oldpeak": 2.3,
  "slope": "flat",
  "ca": "0",
  "thal": "normal"
}
```

**Response:**
```json
{
  "probability": 72.4,
  "risk_level": "High"
}
```

---

### `GET /patients` *(Requires Auth)*
Returns all saved patient records.

### `DELETE /patients/<id>` *(Requires Auth)*
Deletes a patient record by ID.

### `POST /auth/login`
```json
{ "username": "admin", "password": "your_password" }
```

### `POST /auth/logout`
Clears the session.

### `GET /auth/status`
Returns `{ "authenticated": true/false }`.

---

## 📓 Model Training

The model was trained in `macroproject.ipynb`. To retrain:

1. Open the notebook
2. Run all cells
3. The trained pipeline will be saved as `model.pkl`

---

## 🙏 Acknowledgements

- [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/datasets/heart+Disease) — Heart Disease Dataset
- [AHA/ACC 2019 Guidelines](https://www.ahajournals.org/) — Clinical reference guidelines
- [Scikit-learn](https://scikit-learn.org/) — ML framework
- [Flask](https://flask.palletsprojects.com/) — Web framework

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

> Built with ♥ by [Your Name] · CardioPulse AI © 2024
