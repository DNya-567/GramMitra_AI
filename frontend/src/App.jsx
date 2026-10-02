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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppLayout />}>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}