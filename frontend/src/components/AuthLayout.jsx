export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.brandPanel}>
        <h1 style={styles.wordmark}>GramMitra</h1>
        <p style={styles.mission}>
          Crop advice, weather guidance, and government schemes — in your own language.
        </p>
      </div>
      <div style={styles.formPanel}>
        <div style={styles.formInner}>
          <h2>{title}</h2>
          {subtitle && <p style={{ marginTop: "0.4rem", marginBottom: "1.5rem" }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    flexWrap: "wrap",
  },
  brandPanel: {
    flex: "1 1 320px",
    background: "linear-gradient(160deg, #33633c, #244a2b)",
    color: "#fff",
    padding: "3rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  wordmark: {
    color: "#fff",
    fontSize: "2.5rem",
    marginBottom: "1rem",
  },
  mission: {
    color: "#e9f1e6",
    fontSize: "1.1rem",
    maxWidth: "26ch",
  },
  formPanel: {
    flex: "1 1 380px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    background: "#faf6ec",
  },
  formInner: {
    width: "100%",
    maxWidth: "360px",
  },
};