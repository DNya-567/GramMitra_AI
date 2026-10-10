import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import {
  Home,
  Activity,
  Thermometer,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Building,
  User,
  LogOut,
  Menu,
} from 'lucide-react';

export default function AppLayout() {
  const [userEmail, setUserEmail] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Set initial sidebar state based on width and update on resize
  useEffect(() => {
    const checkSidebar = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    checkSidebar();
    window.addEventListener('resize', checkSidebar);
    return () => window.removeEventListener('resize', checkSidebar);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserEmail(session.user.email);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserEmail(session.user.email);
      } else {
        setUserEmail('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-layout">
      {/* Backdrop for mobile sidebar - only rendered when sidebar is open on mobile */}
      {isSidebarOpen ? (
        <div className="backdrop" onClick={toggleSidebar} />
      ) : null}

      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          {isSidebarOpen ? (
            <>
              <h2>GramMitra</h2>
              <p className="sidebar-tagline">किसान का साथी</p>
            </>
          ) : (
            <h2 className="collapsed-logo">G</h2>
          )}
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Home">
            <Home /> Home
          </NavLink>
          <NavLink to="/crop" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Crop Recommendation">
            <Activity /> Crop Recommendation
          </NavLink>
          <NavLink to="/weather" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Weather Advisory">
            <Thermometer /> Weather Advisory
          </NavLink>
          <NavLink to="/fertilizer" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Fertilizer Suggestion">
            <Sparkles /> Fertilizer Suggestion
          </NavLink>
          <NavLink to="/chatbot" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Ask GramMitra">
            <MessageSquare /> Ask GramMitra
          </NavLink>
          <NavLink to="/complaint" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Report a Problem">
            <AlertTriangle /> Report a Problem
          </NavLink>
          <NavLink to="/prices" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Market Prices">
            <DollarSign /> Market Prices
          </NavLink>
          <NavLink to="/schemes" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Scheme Guidance">
            <Building /> Scheme Guidance
          </NavLink>
          <NavLink to="/profile" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Profile">
            <User /> Profile
          </NavLink>
          <NavLink to="/profile" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Log Out">
            <LogOut /> Log Out
          </NavLink>
        </nav>
      </aside>

      <div className="app-layout-main">
        <header className="top-bar">
          <div className="top-bar-left">
            <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Open menu">
              <Menu size={24} />
            </button>
            <button className="lang-toggle">EN</button>
            <button className="dark-mode-toggle">
              {/* We'll use a sun icon for light mode and moon for dark? For now, just a placeholder */}
              <Activity /> {/* Placeholder for dark mode toggle */}
            </button>
          </div>
          <div className="top-bar-right">
            <span className="user-email">{userEmail}</span>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut /> Log out
            </button>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}