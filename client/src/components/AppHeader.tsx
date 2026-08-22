import { LayoutGrid, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

type AppHeaderProps = {
  mode: "gallery" | "admin";
  active?: "home" | "collections";
};

export default function AppHeader({ mode, active }: AppHeaderProps) {
  const [, navigate] = useLocation();
  return <header className="app-header">
    <button className="wordmark" onClick={() => navigate("/")}>GALLERY</button>
    <div className="app-header-right">
      <nav className="app-page-nav" aria-label="Gallery navigation">
        <button className={active === "home" ? "active" : ""} onClick={() => navigate("/")}>Home</button>
        <button className={active === "collections" ? "active" : ""} onClick={() => navigate("/collections")}>Collections</button>
      </nav>
      <div className="mode-switch" aria-label="Application mode">
        <button className={mode === "gallery" ? "active" : ""} onClick={() => navigate("/")}><LayoutGrid size={14} /> Gallery</button>
        <button className={mode === "admin" ? "active" : ""} onClick={() => navigate("/manage")}><ShieldCheck size={14} /> Admin</button>
      </div>
    </div>
  </header>;
}
