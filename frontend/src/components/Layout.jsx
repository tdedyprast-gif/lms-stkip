import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Avatar, AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, BookOpen, Users, Target, PieChart, GraduationCap,
  Sun, Moon, Menu, LogOut, MoreHorizontal,
} from "lucide-react";

const roleLabel = { admin: "Administrator", dosen: "Dosen", mahasiswa: "Mahasiswa" };

function navItems(role) {
  const items = [
    { to: "/", label: "Dashboard", short: "Beranda", icon: LayoutDashboard, testid: "nav-dashboard" },
    { to: "/courses", label: "Mata Kuliah", short: "Kuliah", icon: BookOpen, testid: "nav-courses" },
  ];
  if (role === "mahasiswa")
    items.push({ to: "/portfolio", label: "Portofolio Saya", short: "Portofolio", icon: PieChart, testid: "nav-portfolio" });
  if (role === "admin") {
    items.push({ to: "/admin/users", label: "Pengguna", short: "Pengguna", icon: Users, testid: "nav-users" });
    items.push({ to: "/admin/cpl", label: "CPL Prodi", short: "CPL", icon: Target, testid: "nav-cpl" });
  }
  return items;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
      <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
        <GraduationCap className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="leading-tight min-w-0">
        <p className="font-heading font-bold text-sm truncate">STKIP Pacitan</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">OBE-LMS</p>
      </div>
    </div>
  );
}

function NavItems({ role, onNavigate, compact }) {
  const items = navItems(role);
  return items.map((it) => (
    <NavLink
      key={it.to}
      to={it.to}
      end={it.to === "/"}
      onClick={onNavigate}
      data-testid={it.testid}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 text-sm font-medium ${
          compact ? "py-3 min-h-11" : "py-2.5 card-lift"
        } ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`
      }
    >
      <it.icon style={{ width: 18, height: 18 }} className="shrink-0" />
      <span className="truncate">{it.label}</span>
    </NavLink>
  ));
}

function SidebarContent({ role, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <BrandMark />
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavItems role={role} onNavigate={onNavigate} />
      </nav>
      <div className="p-4 border-t border-border">
        <div className="rounded-lg bg-accent/60 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-accent-foreground">Kampus Humanis & Religius</p>
          <p className="mt-1">Outcome-Based Education</p>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ role, onMore }) {
  const { pathname } = useLocation();
  const items = navItems(role);
  const primary = items.slice(0, 3);
  const overflow = items.slice(3);
  const moreActive = overflow.some((it) => pathname === it.to || pathname.startsWith(`${it.to}/`));

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      data-testid="mobile-bottom-nav"
      aria-label="Navigasi utama"
    >
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${primary.length + (overflow.length ? 1 : 0)}, minmax(0, 1fr))` }}>
        {primary.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            data-testid={`mobile-${it.testid}`}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-h-11 px-1 text-[11px] font-medium ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <it.icon className="h-5 w-5" />
            <span className="truncate max-w-full">{it.short || it.label}</span>
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button
            type="button"
            onClick={onMore}
            data-testid="mobile-nav-more"
            className={`flex flex-col items-center justify-center gap-1 min-h-11 px-1 text-[11px] font-medium ${
              moreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Lainnya</span>
          </button>
        )}
      </div>
    </nav>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const role = user?.role;
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-border bg-card flex-col z-40">
        <SidebarContent role={role} />
      </aside>

      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 glass border-b border-border flex items-center gap-2 sm:gap-3 px-3 sm:px-6 pt-[env(safe-area-inset-top)]">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0" data-testid="mobile-menu-button" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[min(20rem,88vw)]">
              <SidebarContent role={role} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="lg:hidden flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <p className="font-heading font-bold text-sm truncate">OBE-LMS</p>
          </div>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" onClick={toggle} data-testid="theme-toggle" className="rounded-full">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full pl-2 pr-1 py-1 hover:bg-accent card-lift" data-testid="user-menu">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold leading-tight">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{roleLabel[role]}</p>
                </div>
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} data-testid="logout-button" className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="p-4 md:p-8 max-w-[1400px] mx-auto pb-24 lg:pb-8">{children}</main>
        <MobileBottomNav role={role} onMore={() => setOpen(true)} />
      </div>
    </div>
  );
}
