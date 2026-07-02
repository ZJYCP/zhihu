import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { BookOpen, Sparkle, Sun, Moon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/shared/utils";

export function Navbar() {
  const pathname = useLocation().pathname;
  const { theme, setTheme } = useTheme();

  const navItems = [
    { to: "/", label: "内容库", icon: BookOpen },
    { to: "/stats", label: "统计", icon: BarChart3 },
    { to: "/about", label: "关于", icon: Sparkle },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--background))]/80 backdrop-blur-xl">
      <div className="container mx-auto max-w-6xl flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group"
        >
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 transition-transform duration-200 group-hover:scale-105">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg hidden sm:inline bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--muted-foreground))] bg-clip-text text-transparent">
            拾盐记
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-1 bg-[hsl(var(--muted))]/50 rounded-full p-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "text-[hsl(var(--foreground))] bg-[hsl(var(--background))] shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full w-9 h-9 p-0 hover:bg-[hsl(var(--muted))]"
        >
          <div className="relative">
            <Sun className={cn(
              "h-4 w-4 transition-all duration-300",
              theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"
            )} />
            <Moon className={cn(
              "h-4 w-4 absolute inset-0 transition-all duration-300",
              theme === "dark" ? "-rotate-90 scale-0" : "rotate-0 scale-100"
            )} />
          </div>
        </Button>
      </div>
    </header>
  );
}
