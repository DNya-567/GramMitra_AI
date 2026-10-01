import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function CropRecommend() {
  const [form, setForm] = useState({
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    temperature: "",
    humidity: "",
    ph: "",
    rainfall_mm: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await apiFetch("/crop/recommend", {
        method: "POST",
        body: JSON.stringify({
          nitrogen: Number(form.nitrogen),
          phosphorus: Number(form.phosphorus),
          potassium: Number(form.potassium),
          temperature: Number(form.temperature),
          humidity: Number(form.humidity),
          ph: Number(form.ph),
          rainfall_mm: Number(form.rainfall_mm),
        }),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <button className="btn-text" onClick={() => navigate("/dashboard")} style={{ marginBottom: "1rem" }}>
        Back to Dashboard
      </button>
      <h1>Crop Recommendation</h1>
      <p style={{ marginBottom: "1.5rem" }}>Enter your soil and climate details below.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Nitrogen (N)</label>
          <input name="nitrogen" type="number" value={form.nitrogen} onChange={handleChange} required />
        </div>
        <div className="field">
          <label>Phosphorus (P)</label>
          <input name="phosphorus" type="number" value={form.phosphorus} onChange={handleChange} required />
        </div>
        <div className="field">
          <label>Potassium (K)</label>
          <input name="potassium" type="number" value={form.potassium} onChange={handleChange} required />
        </div>
        <div className="field">
          <label>Temperature (C)</label>
          <input name="temperature" type="number" step="0.1" value={form.temperature} onChange={handleChange} required />
        </div>
        <div className="field">
          <label>Humidity (%)</label>
          <input name="humidity" type="number" step="0.1" value={form.humidity} onChange={handleChange} required />
        </div>
        <div className="field">
          <label>Soil pH</label>
          <input name="ph" type="number" step="0.1" value={form.ph} onChange={handleChange} required />
        </div>
        <div className="field">
          <label>Rainfall (mm)</label>
          <input name="rainfall_mm" type="number" value={form.rainfall_mm} onChange={handleChange} required />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Checking..." : "Get recommendation"}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: "1.5rem", background: "#fff", border: "1px solid var(--color-line)", borderLeft: "4px solid #33633c", borderRadius: "8px", padding: "1.25rem" }}>
          <h3>Recommended crop: {result.recommended_crop}</h3>
          <p style={{ marginTop: "0.35rem" }}>Confidence: {(result.confidence * 100).toFixed(0)}%</p>
        </div>
      )}
    </div>
  );
}
