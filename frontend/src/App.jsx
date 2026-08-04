import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CropRecommend from './pages/CropRecommend.jsx'
import WeatherAdvisory from './pages/WeatherAdvisory.jsx'
import FertilizerSuggest from './pages/FertilizerSuggest.jsx'
import Chatbot from './pages/Chatbot.jsx'
import ComplaintForm from './pages/ComplaintForm.jsx'
import SchemeGuidance from './pages/SchemeGuidance.jsx'
import MarketPrices from './pages/MarketPrices.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/crop-recommend" element={<CropRecommend />} />
      <Route path="/weather-advisory" element={<WeatherAdvisory />} />
      <Route path="/fertilizer-suggest" element={<FertilizerSuggest />} />
      <Route path="/chatbot" element={<Chatbot />} />
      <Route path="/complaint" element={<ComplaintForm />} />
      <Route path="/schemes" element={<SchemeGuidance />} />
      <Route path="/market-prices" element={<MarketPrices />} />
    </Routes>
  )
}
