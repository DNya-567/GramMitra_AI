import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CropRecommend from "./pages/CropRecommend.jsx";
import WeatherAdvisory from "./pages/WeatherAdvisory.jsx";
import FertilizerSuggest from "./pages/FertilizerSuggest.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import ComplaintForm from "./pages/ComplaintForm.jsx";
import MarketPrices from "./pages/MarketPrices.jsx";
import SchemeGuidance from "./pages/SchemeGuidance.jsx";
import Profile from "./pages/Profile.jsx";
import AppLayout from "./components/AppLayout.jsx";
import { ProfileProvider } from './lib/profileContext';
import { initUserSession } from './lib/userSession';

// Initialize user session caching
initUserSession();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.reload()}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<AppLayout />}>
            <ProfileProvider>
              <Routes>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="crop" element={<CropRecommend />} />
                <Route path="weather" element={<WeatherAdvisory />} />
                <Route path="fertilizer" element={<FertilizerSuggest />} />
                <Route path="chatbot" element={<Chatbot />} />
                <Route path="complaint" element={<ComplaintForm />} />
                <Route path="prices" element={<MarketPrices />} />
                <Route path="schemes" element={<SchemeGuidance />} />
                <Route path="profile" element={<Profile />} />
              </Routes>
            </ProfileProvider>
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}