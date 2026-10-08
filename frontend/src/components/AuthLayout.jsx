export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-layout-wrapper">
      <div className="auth-layout-brand-panel">
        <h1 className="auth-layout-wordmark">GramMitra</h1>
        <p className="auth-layout-mission">
          Crop advice, weather guidance, and government schemes — in your own language.
        </p>
      </div>
      <div className="auth-layout-form-panel">
        <div className="auth-layout-form-inner">
          <h2>{title}</h2>
          {subtitle && <p className="auth-layout-subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
