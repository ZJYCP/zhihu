"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { BookOpen, Settings, Sun, Moon, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const navItems = [
    { href: "/", label: "内容库", icon: BookOpen },
    { href: "/stats", label: "统计", icon: BarChart3 },
    { href: "/settings", label: "设置", icon: Settings },
  ]

  // 点击当前页面链接时刷新
  const handleClick = (e: React.MouseEvent, href: string) => {
    if (pathname === href) {
      e.preventDefault()
      window.location.href = href
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--background))]/80 backdrop-blur-xl">
      <div className="container mx-auto max-w-6xl flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          onClick={(e) => handleClick(e, "/")}
          className="flex items-center gap-3 group"
        >
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 transition-transform duration-200 group-hover:scale-105">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg hidden sm:inline bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--muted-foreground))] bg-clip-text text-transparent">
            知乎内容库
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-1 bg-[hsl(var(--muted))]/50 rounded-full p-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleClick(e, item.href)}
              >
                <button
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-[hsl(var(--foreground))] bg-[hsl(var(--background))] shadow-sm"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
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
  )
}
