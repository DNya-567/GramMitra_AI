import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { apiFetch } from "../api/client";
import {
  Edit2,
  Save,
  X,
} from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  // Original values for cancel (to reset)
  const [originalValues, setOriginalValues] = useState(null);
  // Current editable fields state
  const [editableFields, setEditableFields] = useState({
    farmSize: "2.5",
    soilType: "Loamy",
    primaryCrop: "Cotton",
    phone: "+91 98765 43210",
    preferredLanguage: "Marathi",
    location: "Akola, Maharashtra",
  });
  // Save loading state
  const [saving, setSaving] = useState(false);
  // Message state for success/error
  const [message, setMessage] = useState({ text: "", type: "" }); // type: "success" or "error"

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          const userData = {
            email: session.user.email,
            name: session.user.email?.split('@')[0] || "User",
          };
          setUser(userData);
        } else if (mounted) {
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Session error:", err);
        if (mounted) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mounted) {
        const userData = {
          email: session.user.email,
          name: session.user.email?.split('@')[0] || "User",
        };
        setUser(userData);
      } else if (mounted) {
        setUser(null);
        navigate("/login", { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return <div className="page-container">Loading...</div>;
  }

  if (!user) {
    return <div className="page-container">Not authenticated</div>;
  }

  const name = user.name;
  const email = user.email;
  // Get initials: first two letters of name, or first letter of each part if spaced
  const initials = name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || "??";

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      // Call the API to update profile
      await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify(editableFields),
      });
      // On success, update original values and show success message
      setOriginalValues({ ...editableFields });
      setMessage({ text: "Saved", type: "success" });
      // Hide message after 2 seconds
      setTimeout(() => {
        setMessage({ text: "", type: "" });
      }, 2000);
    } catch (err) {
      console.error("Save error:", err);
      setMessage({ text: "Failed to save: " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setEditableFields({ ...originalValues });
    setEditMode(false);
    setMessage({ text: "", type: "" });
  };

  const handleEdit = () => {
    // Save current values as original for cancel
    setOriginalValues({ ...editableFields });
    setEditMode(true);
  };

  return (
    <div className="page-container">
      <div className="profile-card">
        {/* Avatar */}
        <div className="avatar">
          <span className="avatar-initials">{initials}</span>
        </div>

        {/* Name and Email */}
        <div className="profile-info">
          <h2>{name}</h2>
          <p className="profile-email">{email}</p>
          {/* Edit button */}
          <button
            className="btn-text"
            onClick={handleEdit}
            disabled={saving}
          >
            <Edit2 size={16} />
          </button>
        </div>
      </div>

      {/* Stat Boxes */}
      <div className="stats-grid">
        <div className="stat-box">
          <h3>Crops tracked</h3>
          <p className="stat-value">5</p>
        </div>
        <div className="stat-box">
          <h3>Reports filed</h3>
          <p className="stat-value">12</p>
        </div>
        <div className="stat-box">
          <h3>Days active</h3>
          <p className="stat-value">45</p>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <p className={`error-text ${message.type === "success" ? "" : "error-text"}`}>
          {message.text}
        </p>
      )}

      {/* Details List */}
      <div className="profile-details">
        <h3>Profile Details</h3>
        {editMode ? (
          // Edit mode: show form inputs
          <>
            <div className="field">
              <label>Farm size (acres)</label>
              <input
                type="number"
                value={editableFields.farmSize}
                onChange={(e) =>
                  setEditableFields({
                    ...editableFields,
                    farmSize: e.target.value,
                  })
                }
              />
            </div>
            <div className="field">
              <label>Soil type</label>
              <select
                value={editableFields.soilType}
                onChange={(e) =>
                  setEditableFields({
                    ...editableFields,
                    soilType: e.target.value,
                  })
                }
              >
                <option value="Alluvial">Alluvial</option>
                <option value="Black Cotton">Black Cotton</option>
                <option value="Red Soil">Red Soil</option>
                <option value="Laterite">Laterite</option>
                <option value="Sandy">Sandy</option>
                <option value="Loamy">Loamy</option>
                <option value="Clayey">Clayey</option>
              </select>
            </div>
            <div className="field">
              <label>Primary crop</label>
              <input
                type="text"
                value={editableFields.primaryCrop}
                onChange={(e) =>
                  setEditableFields({
                    ...editableFields,
                    primaryCrop: e.target.value,
                  })
                }
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                value={editableFields.phone}
                onChange={(e) =>
                  setEditableFields({
                    ...editableFields,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div className="field">
              <label>Preferred language</label>
              <select
                value={editableFields.preferredLanguage}
                onChange={(e) =>
                  setEditableFields({
                    ...editableFields,
                    preferredLanguage: e.target.value,
                  })
                }
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>
            <div className="field">
              <label>Location</label>
              <input
                type="text"
                value={editableFields.location}
                onChange={(e) =>
                  setEditableFields({
                    ...editableFields,
                    location: e.target.value,
                  })
                }
              />
            </div>
            <div className="field">
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                className="btn-text"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          // View mode: show details as text
          <dl>
            <dt>Farm size</dt>
            <dd>{editableFields.farmSize} acres</dd>
            <dt>Soil type</dt>
            <dd>{editableFields.soilType}</dd>
            <dt>Primary crop</dt>
            <dd>{editableFields.primaryCrop}</dd>
            <dt>Phone</dt>
            <dd>{editableFields.phone}</dd>
            <dt>Preferred language</dt>
            <dd>{editableFields.preferredLanguage}</dd>
            <dt>Location</dt>
            <dd>{editableFields.location}</dd>
          </dl>
        )}
      </div>

      {/* Logout Button */}
      <button
        className="btn-outline-red btn-full"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
        }}
      >
        Log Out
      </button>
    </div>
  );
}