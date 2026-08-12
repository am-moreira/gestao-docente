import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, BookOpenCheck, CalendarClock, ChevronRight, LayoutDashboard, LogOut, PanelLeft, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: CalendarClock, label: "Faltas", path: "/faltas" },
  { icon: BookOpenCheck, label: "Tarefas", path: "/tarefas" },
  { icon: UsersRound, label: "Professores", path: "/professores", admin: true },
  { icon: ShieldCheck, label: "Acessos", path: "/acessos", admin: true },
];

const SIDEBAR_WIDTH_KEY = "gestao-docente-sidebar-width";
const DEFAULT_WIDTH = 272;
const MIN_WIDTH = 220;
const MAX_WIDTH = 360;

function ProfileInitials(name?: string | null) {
  return name?.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase() || "GD";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString()), [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return <div className="auth-shell"><div className="auth-card"><div className="brand-mark"><BarChart3 size={22} /></div><p className="eyebrow">GESTÃO DOCENTE</p><h1>Acompanhe sua equipe com precisão.</h1><p>Entre para acessar os dados de faltas, tarefas e desempenho docente do seu segmento.</p><Button onClick={() => startLogin()} size="lg" className="w-full">Acessar sistema <ChevronRight size={16} /></Button></div></div>;
  }

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const items = menuItems.filter(item => !item.admin || user?.role === "admin");
  const current = items.find(item => item.path === location) ?? items[0];

  useEffect(() => { if (isCollapsed) setIsResizing(false); }, [isCollapsed]);
  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = event.clientX - left;
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width);
    };
    const up = () => setIsResizing(false);
    if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
  }, [isResizing, setSidebarWidth]);

  return <>
    <div className="relative" ref={sidebarRef}>
      <Sidebar collapsible="icon" className="app-sidebar border-r-0" disableTransition={isResizing}>
        <SidebarHeader className="h-[104px] justify-center px-3">
          <div className="flex items-center gap-3 min-w-0"><button onClick={toggleSidebar} className="brand-mark shrink-0" aria-label="Alternar navegação"><PanelLeft size={17} /></button>{!isCollapsed && <div className="min-w-0"><p className="brand-title">Gestão Docente</p><p className="brand-subtitle">Painel educacional</p></div>}</div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">
          {!isCollapsed && <p className="px-3 pb-3 text-[10px] font-bold tracking-[0.16em] text-sidebar-foreground/45">MENU PRINCIPAL</p>}
          <SidebarMenu className="gap-1">
            {items.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="menu-button h-11"><item.icon size={18} /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="px-3 pb-5">
          <div className="sidebar-separator" />
          <DropdownMenu><DropdownMenuTrigger asChild><button className="profile-trigger"><Avatar className="h-9 w-9 shrink-0"><AvatarFallback>{ProfileInitials(user?.name)}</AvatarFallback></Avatar>{!isCollapsed && <div className="min-w-0 text-left"><p className="truncate text-sm font-semibold leading-none">{user?.name || "Usuário"}</p><p className="mt-1.5 truncate text-xs text-sidebar-foreground/55">{user?.role === "admin" ? "Administrador" : "Responsável de segmento"}</p></div>}</button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair do sistema</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <div className={`absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} style={{ zIndex: 50 }} />
    </div>
    <SidebarInset className="min-w-0">
      {isMobile && <div className="mobile-header"><SidebarTrigger className="h-9 w-9 rounded-xl" /><span>{current.label}</span></div>}
      <main className="min-h-screen p-4 md:p-7 lg:p-9">{children}</main>
    </SidebarInset>
  </>;
}
