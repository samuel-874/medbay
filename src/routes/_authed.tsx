import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSessionUser, useLogout, type User } from "@/lib/medbay-store";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const { data: user, isLoading } = useSessionUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar user={user} />
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      <main className="flex-1 min-w-0">
        <Topbar user={user} onOpenSidebar={() => setSidebarOpen(true)} />
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Sidebar({ user }: { user: User }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/dashboard", label: "Overview", icon: HomeIcon },
    { to: "/patients", label: "Patients", icon: HeartIcon },
    { to: "/appointments", label: "Appointments", icon: CalendarIcon },
    { to: "/schedule", label: "Duty roster", icon: ClockIcon },
    ...(user.role === "admin" ? [{ to: "/staff", label: "Staff", icon: UsersIcon }] : []),
  ];

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card/50 print:hidden">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-serif text-lg">
            M
          </span>
          <span className="font-serif text-xl text-primary">MedBay</span>
        </div>
        <div className="mt-4 px-3 py-2 rounded-lg bg-secondary/40 border border-border/60">
          <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
            Workspace
          </div>
          <div
            className="text-xs font-semibold text-foreground truncate mt-0.5"
            title={user.hospitalName}
          >
            {user.hospitalName}
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {items.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground")
              }
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-border text-xs text-muted-foreground">
        Signed in as <span className="text-foreground font-medium">{user.username}</span>
        <div className="text-[10px] uppercase tracking-wider">{user.role}</div>
      </div>
    </aside>
  );
}

function Topbar({ user, onOpenSidebar }: { user: User; onOpenSidebar: () => void }) {
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur print:hidden">
      <div className="md:hidden flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground font-serif">
            M
          </span>
          <span className="font-serif text-lg text-primary">MedBay</span>
        </div>
      </div>
      <div className="hidden md:block text-sm text-muted-foreground">
        {new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-sm text-muted-foreground">Hi, {user.username}</span>
        <button
          onClick={async () => {
            await logoutMutation.mutateAsync();
            navigate({ to: "/login" });
          }}
          disabled={logoutMutation.isPending}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
        >
          {logoutMutation.isPending ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}

function MobileSidebar({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  const items = [
    { to: "/dashboard", label: "Overview", icon: HomeIcon },
    { to: "/patients", label: "Patients", icon: HeartIcon },
    { to: "/appointments", label: "Appointments", icon: CalendarIcon },
    { to: "/schedule", label: "Duty roster", icon: ClockIcon },
    ...(user.role === "admin" ? [{ to: "/staff", label: "Staff", icon: UsersIcon }] : []),
  ];

  useEffect(() => {
    onClose();
  }, [pathname]);

  return (
    <div
      className={
        "fixed inset-0 z-50 md:hidden transition-all duration-300 print:hidden " +
        (open ? "visible opacity-100" : "invisible opacity-0 pointer-events-none")
      }
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <aside
        className={
          "absolute top-0 bottom-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl transition-transform duration-300 ease-in-out " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="px-6 py-5 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-serif text-lg">
                M
              </span>
              <span className="font-serif text-xl text-primary">MedBay</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
              aria-label="Close sidebar"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-secondary/40 border border-border/60">
            <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
              Workspace
            </div>
            <div
              className="text-xs font-semibold text-foreground truncate mt-0.5"
              title={user.hospitalName}
            >
              {user.hospitalName}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                }
              >
                <Icon className="h-4.5 w-4.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border flex items-center justify-between gap-2 bg-secondary/10">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">{user.username}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {user.role}
            </div>
          </div>
          <button
            onClick={async () => {
              onClose();
              await logoutMutation.mutateAsync();
              navigate({ to: "/login" });
            }}
            disabled={logoutMutation.isPending}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50 cursor-pointer shrink-0"
          >
            {logoutMutation.isPending ? "..." : "Sign out"}
          </button>
        </div>
      </aside>
    </div>
  );
}

/* icons */
function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10.5Z" />
    </svg>
  );
}
function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20.8 7.6a5.5 5.5 0 0 0-9.3-2.5L12 5.6l-.5-.5a5.5 5.5 0 1 0-7.8 7.8l7.6 7.6a1 1 0 0 0 1.4 0l7.6-7.6a5.5 5.5 0 0 0 .5-5.3Z" />
    </svg>
  );
}
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 11a3 3 0 1 0 0-6M21.5 20a5.5 5.5 0 0 0-4-5.3" />
    </svg>
  );
}
