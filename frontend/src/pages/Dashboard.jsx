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
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
        return;
      }
      setEmail(session.user.email);
    });
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h1>GramMitra</h1>
        <div className="dashboard-user-info">
          <span className="dashboard-user-email">{email}</span>
          <button className="btn-text" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      <h2 className="dashboard-title">What do you need today?</h2>
      <p className="dashboard-description">Pick a service below to get started.</p>

      <div className="dashboard-grid">
        {FEATURES.map((f) => (
          <button
            key={f.path}
            onClick={() => navigate(f.path)}
            className={`dashboard-tile border-left-${f.color.replace("#", "")}`}
          >
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}