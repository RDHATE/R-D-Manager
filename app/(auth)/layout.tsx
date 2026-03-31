export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 20% 50%, rgba(34,211,238,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%), #060d1a", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {children}
    </div>
  )
}
