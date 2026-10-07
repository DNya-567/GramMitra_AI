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
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [originalValues, setOriginalValues] = useState({});
  const [editableFields, setEditableFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [error, setError] = useState(null); // API error message (non-401)
  const navigate = useNavigate();

  // Helper to check if error is 401 Unauthorized
  const isUnauthorizedError = (err) => {
    return (
      err &&
      (err.message.includes("401") ||
        err.message.includes("Unauthorized") ||
        err.message.includes("Missing bearer token"))
    );
  };

  useEffect(() => {
    let mounted = true;

    const getSessionAndProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          const userData = {
            email: session.user.email,
            name: session.user.email?.split('@')[0] || "User",
          };
          setUser(userData);

          // Fetch profile data
          try {
            const profileData = await apiFetch("/profile");
            if (mounted) {
              setProfile(profileData);
              // Initialize editableFields from real response, fallback to empty string only for genuinely null fields
              setEditableFields({
                farmSize:
                  profileData.farm_size_acres !== null &&
                  profileData.farm_size_acres !== undefined
                    ? String(profileData.farm_size_acres)
                    : "",
                soilType:
                  profileData.soil_type !== null &&
                  profileData.soil_type !== undefined
                    ? profileData.soil_type
                    : "",
                primaryCrop:
                  profileData.primary_crop !== null &&
                  profileData.primary_crop !== undefined
                    ? profileData.primary_crop
                    : "",
                phone:
                  profileData.phone !== null &&
                  profileData.phone !== undefined
                    ? profileData.phone
                    : "",
                preferredLanguage:
                  profileData.preferred_language !== null &&
                  profileData.preferred_language !== undefined
                    ? profileData.preferred_language
                    : "English",
                location:
                  profileData.location !== null &&
                  profileData.location !== undefined
                    ? profileData.location
                    : "",
              });
              setLoading(false);
            }
          } catch (err) {
            if (mounted) {
              setLoading(false);
              if (isUnauthorizedError(err)) {
                // Redirect to login on 401
                navigate("/login", { replace: true });
              } else {
                // Show error message, keep user logged in
                setError(
                  "Couldn't load your profile — try again"
                );
                setProfile(null); // hide profile while error is shown
                setEditableFields({});
              }
            }
          }
        } else if (mounted) {
          // No session
          setUser(null);
          setProfile(null);
          setEditableFields({});
          setLoading(false);
          navigate("/login", { replace: true });
        }
      } catch (err) {
        if (mounted) {
          setLoading(false);
          setError(
            "Couldn't load your profile — try again"
          );
          setUser(null);
          setProfile(null);
          setEditableFields({});
        }
      }
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session && mounted) {
          const userData = {
            email: session.user.email,
            name: session.user.email?.split('@')[0] || "User",
          };
          setUser(userData);
          // Refetch profile without affecting the loading state (because we are already loaded)
          if (mounted) {
            apiFetch("/profile")
              .then(profileData => {
                if (mounted) {
                  setProfile(profileData);
                  setEditableFields({
                    farmSize:
                      profileData.farm_size_acres !== null &&
                      profileData.farm_size_acres !== undefined
                        ? String(profileData.farm_size_acres)
                        : "",
                    soilType:
                      profileData.soil_type !== null &&
                      profileData.soil_type !== undefined
                        ? profileData.soil_type
                        : "",
                    primaryCrop:
                      profileData.primary_crop !== null &&
                      profileData.primary_crop !== undefined
                        ? profileData.primary_crop
                        : "",
                    phone:
                      profileData.phone !== null &&
                      profileData.phone !== undefined
                        ? profileData.phone
                        : "",
                    preferredLanguage:
                      profileData.preferred_language !== null &&
                      profileData.preferred_language !== undefined
                        ? profileData.preferred_language
                        : "English",
                    location:
                      profileData.location !== null &&
                      profileData.location !== undefined
                        ? profileData.location
                        : "",
                  });
                  // Clear any previous error on successful refetch
                  setError(null);
                }
              })
              .catch(err => {
                if (mounted) {
                  console.error("Failed to refetch profile on auth state change:", err);
                  setProfile(null);
                  setEditableFields({});
                  if (isUnauthorizedError(err)) {
                    // Sign out and redirect to login on 401
                    supabase.auth.signOut();
                    navigate("/login", { replace: true });
                  } else {
                    setError(
                      "Couldn't load your profile — try again"
                    );
                  }
                }
              });
          }
        } else if (mounted) {
          // No session
          setUser(null);
          setProfile(null);
          setEditableFields({});
          navigate("/login", { replace: true });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return <div className="page-container">Loading...</div>;
  }

  // If there's an error and no profile, show error with retry
  if (error && !profile) {
    return (
      <div className="page-container">
        <p className="error-text">{error}</p>
        <button
          className="btn-primary"
          onClick={() => {
            setError(null);
            // Trigger a refetch by calling getSessionAndProfile again? We'll just refetch profile directly.
            // We'll reuse the same logic: call apiFetch and handle result.
            // For simplicity, we'll just set loading and call apiFetch.
            // But we need to ensure we have a user (session). We'll check user.
            if (!user) {
              // No user, redirect to login
              navigate("/login", { replace: true });
              return;
            }
            // We'll manually refetch; we can call a function but we'll just set loading and call apiFetch.
            // Since we are not in the effect, we need to handle loading state.
            // We'll set loading true, then fetch, then set loading false and update state or error.
            setLoading(true);
            apiFetch("/profile")
              .then(profileData => {
                setLoading(false);
                setProfile(profileData);
                setEditableFields({
                  farmSize:
                    profileData.farm_size_acres !== null &&
                    profileData.farm_size_acres !== undefined
                      ? String(profileData.farm_size_acres)
                      : "",
                  soilType:
                    profileData.soil_type !== null &&
                    profileData.soil_type !== undefined
                      ? profileData.soil_type
                      : "",
                  primaryCrop:
                    profileData.primary_crop !== null &&
                    profileData.primary_crop !== undefined
                      ? profileData.primary_crop
                      : "",
                  phone:
                    profileData.phone !== null &&
                    profileData.phone !== undefined
                      ? profileData.phone
                      : "",
                  preferredLanguage:
                    profileData.preferred_language !== null &&
                    profileData.preferred_language !== undefined
                      ? profileData.preferred_language
                      : "English",
                  location:
                    profileData.location !== null &&
                    profileData.location !== undefined
                      ? profileData.location
                      : "",
                });
                setError(null);
              })
              .catch(err => {
                setLoading(false);
                if (isUnauthorizedError(err)) {
                  navigate("/login", { replace: true });
                } else {
                  setError(
                    "Couldn't load your profile — try again"
                  );
                }
              });
          }}
        >
          Retry
        </button>
      </div>
    );
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
        body: JSON.stringify({
          farm_size_acres:
            editableFields.farmSize === "" ? null : parseFloat(editableFields.farmSize),
          soil_type: editableFields.soilType || null,
          primary_crop: editableFields.primaryCrop || null,
          phone: editableFields.phone || null,
          preferred_language: editableFields.preferredLanguage || null,
          location: editableFields.location || null,
        }),
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
          <p className="stat-value">
            {profile?.stats?.crops_tracked ?? 0}
          </p>
        </div>
        <div className="stat-box">
          <h3>Reports filed</h3>
          <p className="stat-value">
            {profile?.stats?.reports_filed ?? 0}
          </p>
        </div>
        <div className="stat-box">
          <h3>Days active</h3>
          <p className="stat-value">
            {profile?.stats?.days_active ?? 0}
          </p>
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
            <dd>
              {profile?.farm_size_acres !== null &&
              profile?.farm_size_acres !== undefined
                ? `${profile?.farm_size_acres} acres`
                : ""}
            </dd>
            <dt>Soil type</dt>
            <dd>{profile?.soil_type ?? ""}</dd>
            <dt>Primary crop</dt>
            <dd>{profile?.primary_crop ?? ""}</dd>
            <dt>Phone</dt>
            <dd>{profile?.phone ?? ""}</dd>
            <dt>Preferred language</dt>
            <dd>{profile?.preferred_language ?? ""}</dd>
            <dt>Location</dt>
            <dd>{profile?.location ?? ""}</dd>
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