export const GrainOverlay = () => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0"
    style={{ zIndex: 100, mixBlendMode: "overlay", opacity: 0.032 }}
  >
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </div>
);
