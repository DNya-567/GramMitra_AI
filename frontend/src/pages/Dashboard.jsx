import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

const FEATURES = [
  { title: "Crop Recommendation", desc: "Get a crop suggestion based on your soil and rainfall.", path: "/crop", color: "#33633c" },
  { title: "Weather Advisory", desc: "See how the forecast should change your plans.", path: "/weather", color: "#4a7c96" },
  { title: "Fertilizer Suggestion", desc: "Find the right fertilizer for your crop and soil.", path: "/fertilizer", color: "#d9a441" },
  { title: "Ask GramMitra", desc: "Chat in your own language about schemes or crops.", path: "/chatbot", color: "#33633c" },
  { title: "Report a Problem", desc: "Route electricity, water, or crop issues to the right office.", path: "/complaint", color: "#b15e3b" },
  { title: "Market Prices", desc: "Check today's mandi prices near you.", path: "/prices", color: "#4a7c96" },
  { title: "Scheme Guidance", desc: "Check eligibility for PM-KISAN, PMFBY, and more.", path: "/schemes", color: "#d9a441" },
];

export default function Dashboard() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("Friend");
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setEmail(session.user.email);
      // Extract first name from email (before @) or use a default
      const namePart = session.user.email?.split('@')[0] || "Friend";
      setFirstName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
    };

    getSession();
  }, [navigate]);

  return (
    <div className="page-container">
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-text">
          Good morning, {firstName}! 👋
        </div>
        <div className="location-weather">
          Akola, Maharashtra<br />
          32°C · Partly cloudy
        </div>
      </div>

      <h2 className="dashboard-title">What do you need today?</h2>
      <p className="dashboard-description">Pick a service below to get started.</p>

      <div className="dashboard-grid">
        {FEATURES.map((f) => (
          <button
            key={f.path}
            onClick={() => navigate(f.path)}
            className="dashboard-tile"
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="feature-badge" style={{ backgroundColor: f.color }}></span>
              <h3>{f.title}</h3>
            </div>
            <p>{f.desc}</p>
          </button>
        ))}
      </div>

      {/* Tip of the Day Card */}
      <div className="tip-card">
        <h3>💡 Tip of the Day</h3>
        <p>For better crop yield, ensure proper soil preparation by tilling to a depth of 6-8 inches and adding organic compost before planting. This improves soil structure, water retention, and nutrient availability for healthy root development.</p>
      </div>
    </div>
  );
}