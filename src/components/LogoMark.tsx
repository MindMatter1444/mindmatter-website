export const LogoMark = ({ size = 28 }: { size?: number }) => (
  <span
    className="inline-flex items-center justify-center rounded-full font-display"
    style={{
      width: size,
      height: size,
      background: "radial-gradient(circle at 30% 30%, #e6c084, #c89a4a 60%, #8a6628)",
      color: "#141210",
      fontSize: size * 0.55,
      fontWeight: 500,
      lineHeight: 1,
    }}
  >
    M
  </span>
);
