import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "hsl(var(--bg))",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "hsl(var(--gold))",
            marginBottom: 16,
          }}
        >
          404
        </p>
        <h1
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 300,
            color: "hsl(var(--text))",
            marginBottom: 16,
            lineHeight: 1.1,
          }}
        >
          Siden finnes ikke
        </h1>
        <p style={{ color: "hsl(var(--text-dim))", marginBottom: 32 }}>
          Adressen du lette etter eksisterer ikke.
        </p>
        <a
          href="/"
          className="btn-primary"
          style={{ display: "inline-block" }}
        >
          Tilbake til forsiden
        </a>
      </div>
    </div>
  );
};

export default NotFound;
