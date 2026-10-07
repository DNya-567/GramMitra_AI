import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { Activity, Thermometer, Sparkles, MessageSquare, AlertTriangle, DollarSign, Building } from 'lucide-react';

const FEATURES = [
  { title: "Crop Recommendation", desc: "Get a crop suggestion based on your soil and rainfall.", path: "/crop", color: "#33633c", icon: Activity },
  { title: "Weather Advisory", desc: "See how the forecast should change your plans.", path: "/weather", color: "#4a7c96", icon: Thermometer },
  { title: "Fertilizer Suggestion", desc: "Find the right fertilizer for your crop and soil.", path: "/fertilizer", color: "#d9a441", icon: Sparkles },
  { title: "Ask GramMitra", desc: "Chat in your own language about schemes or crops.", path: "/chatbot", color: "#33633c", icon: MessageSquare },
  { title: "Report a Problem", desc: "Route electricity, water, or crop issues to the right office.", path: "/complaint", color: "#b15e3b", icon: AlertTriangle },
  { title: "Market Prices", desc: "Check today's mandi prices near you.", path: "/prices", color: "#4a7c96", icon: DollarSign },
  { title: "Scheme Guidance", desc: "Check eligibility for PM-KISAN, PMFBY, and more.", path: "/schemes", color: "#d9a441", icon: Building },
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
            className={`dashboard-tile ${`border-left-${f.color.replace('#', '')}`}`}
          >
            <div className="feature-icon-badge" style={{ backgroundColor: f.color }}>
              <f.icon className="feature-icon" size={20} color="#fff" />
            </div>
            <div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tip of the Day Card */}
      <div className="tip-card">
        <div className="tip-card-label">TIP OF THE DAY</div>
        <p className="tip-card-text">For better crop yield, ensure proper soil preparation by tilling to a depth of 6-8 inches and adding organic compost before planting.</p>
      </div>
    </div>
  );
}