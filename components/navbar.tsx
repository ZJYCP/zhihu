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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[hsl(var(--background))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/60">
      <div className="container mx-auto max-w-6xl flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">知乎内容库</span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    isActive && "bg-[hsl(var(--secondary))]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  )
}
