import { LayoutGrid, ShieldCheck } from "lucide-react";
import { brand } from "@/lib/brand";
import { useLocation } from "wouter";

type AppHeaderProps = {
  mode: "gallery" | "admin";
  active?: "home" | "albums";
};

export default function AppHeader({ mode, active }: AppHeaderProps) {
  const [, navigate] = useLocation();
  return <header className="app-header">
    <button className="wordmark movement-wordmark" onClick={() => navigate("/")} aria-label={`${brand.name} home`}>
      <span className="movement-mark"><img src={brand.markUrl} alt="" /></span>
      <span>{brand.name}</span>
    </button>
    <div className="app-header-right">
      <nav className="app-page-nav" aria-label="Movement navigation">
        <button className={active === "home" ? "active" : ""} onClick={() => navigate("/")}>Home</button>
        <button className={active === "albums" ? "active" : ""} onClick={() => navigate("/albums")}>Albums</button>
      </nav>
      <div className="mode-switch" aria-label="Application mode">
        <button className={mode === "gallery" ? "active" : ""} onClick={() => navigate("/")}><LayoutGrid size={14} /> Moments</button>
        <button className={mode === "admin" ? "active" : ""} onClick={() => navigate("/manage")}><ShieldCheck size={14} /> Studio</button>
      </div>
    </div>
  </header>;
}
