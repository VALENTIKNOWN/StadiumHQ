import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./global.css";
import Home from "@/components/Home";
import StadiumDetail from "@/components/StadiumDetails";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const qc = new QueryClient();

function Shell() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40  backdrop-blur border-b border-default">
        <div className="flex h-16 justify-between items-center">
          <Link to="/" viewTransition className="text-lg font-semibold mx-4 ">
            <span className="text-gradient">StadiumsHQ</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="container-page py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stadiums/:id" element={<StadiumDetail />} />
        </Routes>
      </main>
      <footer className="border-t border-default">
        <div className="container-page py-6 text-sm">
          <span className="opacity-70">© {new Date().getFullYear()} Stadium Explorer</span>
        </div>
      </footer>
    </div>
  );
}

function ThemeHydrator({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    setReady(true);
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeHydrator>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeHydrator>
  </StrictMode>
);
