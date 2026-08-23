import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Admin from "@/pages/Admin";
import AlbumDetail from "@/pages/AlbumDetail";
import Albums from "@/pages/Albums";
import NotFound from "@/pages/NotFound";
import SharedSlideshow from "@/pages/SharedSlideshow";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  const [location] = useLocation();
  const forceReducedMotion = new URLSearchParams(window.location.search).get("motion") === "reduce";
  // make sure to consider if you need authentication for certain routes
  return (
    <div className={`route-transition${forceReducedMotion ? " motion-reduced" : ""}`} key={location}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/albums"} component={Albums} />
        <Route path={"/albums/:slug"} component={AlbumDetail} />
        <Route path={"/s/:slug"} component={SharedSlideshow} />
        <Route path={"/manage"} component={Admin} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
