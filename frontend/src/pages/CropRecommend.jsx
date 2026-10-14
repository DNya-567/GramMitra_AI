import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

const limits = {
  nitrogen: { min: 0, max: 150, step: 1 },
  phosphorus: { min: 0, max: 150, step: 1 },
  potassium: { min: 0, max: 210, step: 1 },
  temperature: { min: 5, max: 50, step: 0.1 },
  humidity: { min: 10, max: 100, step: 0.1 },
  ph: { min: 3, max: 10, step: 0.1 },
  rainfall_mm: { min: 0, max: 320, step: 1 },
};

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateField = (name, value) => {
    if (value === "") {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return `Must be a number`;
    }
    const { min, max } = limits[name];
    if (num < min || num > max) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} must be between ${min} and ${max}`;
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error,
    }));
    // Clear global error when user starts typing
    if (error === "" && error !== "") {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate all fields
    const newErrors = {};
    let hasError = false;
    Object.keys(limits).forEach(key => {
      const error = validateField(key, form[key]);
      if (error) {
        newErrors[key] = error;
        hasError = true;
      }
    });
    setFieldErrors(newErrors);
    if (hasError) {
      setError("Please fix the errors above");
      return;
    }
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
  };

  const isFormValid = () => {
    return Object.values(fieldErrors).every(err => err === "");
  };

  return (
    <div className="centered-container">
      <button className="btn-text back-link" onClick={() => navigate("/dashboard")}>
        Back to Dashboard
      </button>
      <h1>Crop Recommendation</h1>
      <p className="dashboard-description">Enter your soil and climate details below.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Nitrogen (N)</label>
          <input
            name="nitrogen"
            type="number"
            min={limits.nitrogen.min}
            max={limits.nitrogen.max}
            step={limits.nitrogen.step}
            value={form.nitrogen}
            onChange={handleChange}
            required
          />
          {fieldErrors.nitrogen && <p className="error-text">{fieldErrors.nitrogen}</p>}
        </div>
        <div className="field">
          <label>Phosphorus (P)</label>
          <input
            name="phosphorus"
            type="number"
            min={limits.phosphorus.min}
            max={limits.phosphorus.max}
            step={limits.phosphorus.step}
            value={form.phosphorus}
            onChange={handleChange}
            required
          />
          {fieldErrors.phosphorus && <p className="error-text">{fieldErrors.phosphorus}</p>}
        </div>
        <div className="field">
          <label>Potassium (K)</label>
          <input
            name="potassium"
            type="number"
            min={limits.potassium.min}
            max={limits.potassium.max}
            step={limits.potassium.step}
            value={form.potassium}
            onChange={handleChange}
            required
          />
          {fieldErrors.potassium && <p className="error-text">{fieldErrors.potassium}</p>}
        </div>
        <div className="field">
          <label>Temperature (C)</label>
          <input
            name="temperature"
            type="number"
            min={limits.temperature.min}
            max={limits.temperature.max}
            step={limits.temperature.step}
            value={form.temperature}
            onChange={handleChange}
            required
          />
          {fieldErrors.temperature && <p className="error-text">{fieldErrors.temperature}</p>}
        </div>
        <div className="field">
          <label>Humidity (%)</label>
          <input
            name="humidity"
            type="number"
            min={limits.humidity.min}
            max={limits.humidity.max}
            step={limits.humidity.step}
            value={form.humidity}
            onChange={handleChange}
            required
          />
          {fieldErrors.humidity && <p className="error-text">{fieldErrors.humidity}</p>}
        </div>
        <div className="field">
          <label>Soil pH</label>
          <input
            name="ph"
            type="number"
            min={limits.ph.min}
            max={limits.ph.max}
            step={limits.ph.step}
            value={form.ph}
            onChange={handleChange}
            required
          />
          {fieldErrors.ph && <p className="error-text">{fieldErrors.ph}</p>}
        </div>
        <div className="field">
          <label>Rainfall (mm)</label>
          <input
            name="rainfall_mm"
            type="number"
            min={limits.rainfall_mm.min}
            max={limits.rainfall_mm.max}
            step={limits.rainfall_mm.step}
            value={form.rainfall_mm}
            onChange={handleChange}
            required
          />
          {fieldErrors.rainfall_mm && <p className="error-text">{fieldErrors.rainfall_mm}</p>}
        </div>
        {error && <p className="error-text">{error}</p>}
        <button
          className="btn-primary btn-full"
          type="submit"
          disabled={loading || !isFormValid()}
        >
          {loading ? "Checking..." : "Get recommendation"}
        </button>
      </form>

      {result && (
        <div className="result-card">
          {result.low_confidence ? (
            <>
              <p className="error-text">
                Not enough information to recommend confidently
              </p>
              <p>Top 3 possibilities:</p>
              <ul>
                {result.top3.map((crop, idx) => (
                  <li key={idx}>
                    {crop.crop}: {(crop.probability * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3>Recommended crop: {result.recommended_crop}</h3>
              <p>Confidence: {(result.confidence * 100).toFixed(0)}%</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}