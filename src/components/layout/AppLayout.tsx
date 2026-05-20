import * as api from "@/api/commands";
import { useIdleAutoLogout } from "@/hooks/useIdleAutoLogout";
import { useAuth } from "@/context/AuthContext";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/clinics", label: "Clinics" },
  { to: "/patients", label: "Patients" },
  { to: "/logbook", label: "Logbook" },
  { to: "/reports", label: "Reports" },
  { to: "/backup", label: "Backup" },
  { to: "/settings", label: "Settings" },
];

export function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [idleMinutes, setIdleMinutes] = useState<number | null>(null);

  const loadIdleSetting = useCallback(() => {
    api
      .doctorProfileGet()
      .then((p) => {
        const m = p.autoLockMinutes;
        if (typeof m === "number" && Number.isFinite(m) && m > 0) {
          setIdleMinutes(m);
        } else {
          setIdleMinutes(null);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadIdleSetting();
  }, [location.pathname, loadIdleSetting]);

  useEffect(() => {
    window.addEventListener("doctor-profile-changed", loadIdleSetting);
    return () =>
      window.removeEventListener("doctor-profile-changed", loadIdleSetting);
  }, [loadIdleSetting]);

  const lockSession = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  useIdleAutoLogout({ minutes: idleMinutes ?? undefined, onLock: lockSession });

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-52 flex-col border-r border-[oklch(0.9_0.01_260)] bg-white p-3">
        <div className="mb-4 px-2 text-sm font-semibold text-[oklch(0.35_0.05_250)]">
          Implant Cases
        </div>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-2 py-1.5",
                  isActive
                    ? "bg-[oklch(0.94_0.02_95)] font-medium text-[oklch(0.25_0.05_260)]"
                    : "text-[oklch(0.4_0.02_260)] hover:bg-[oklch(0.97_0.01_95)]",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <Button
          variant="ghost"
          className="mt-4 w-full justify-start text-xs"
          onClick={() => lockSession()}
        >
          Lock session
        </Button>
        {idleMinutes ? (
          <p className="mt-2 px-1 text-[10px] leading-tight text-[oklch(0.48_0.02_260)]">
            Auto-lock after {idleMinutes} min idle (adjust in Settings)
          </p>
        ) : null}
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
