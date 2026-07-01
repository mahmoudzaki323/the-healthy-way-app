"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  UserRound,
} from "lucide-react"

import { signOutAction } from "@/lib/actions"
import { adminNavigation, clientNavigation } from "@/lib/routes"
import type { Profile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BrandMark, FoodAccent } from "@/components/brand-mark"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

type AppShellProps = {
  profile: Profile
  mode?: "client" | "admin"
  children: React.ReactNode
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function NavigationLinks({ mode, onNavigate }: { mode: "client" | "admin"; onNavigate?: () => void }) {
  const pathname = usePathname()
  const items = mode === "admin" ? adminNavigation : clientNavigation

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon
        const isActive =
          item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.title}
              className="h-11"
            >
              <Link href={item.href} onClick={onNavigate}>
                <Icon className="size-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

function AccountMenu({ profile }: { profile: Profile }) {
  const isAdminMode = profile.role === "coach" || profile.role === "admin"
  const profileHref = isAdminMode ? "/admin/settings" : "/profile"
  const settingsHref = isAdminMode ? "/admin/settings" : "/settings"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2">
          <Avatar className="size-9">
            <AvatarFallback>{initials(profile.fullName)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium">{profile.fullName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {isAdminMode ? "Health Coach" : "Client"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileHref}>
            <UserRound className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction} className="px-1 py-1">
          <Button
            type="submit"
            variant="ghost"
            className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-sm font-normal"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell({ profile, mode = "client", children }: AppShellProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b">
          <Link href={mode === "admin" ? "/admin" : "/dashboard"} className="px-2 py-3">
            <BrandMark />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <NavigationLinks mode={mode} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t">
          <AccountMenu profile={profile} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <FoodAccent className="h-2 border-b-0" />
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="size-4" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="border-b p-4">
                  <BrandMark />
                </div>
                <div className="p-3">
                  <NavigationLinks mode={mode} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted-foreground">
                {mode === "admin"
                  ? "Coach admin workspace"
                  : "Client wellness workspace"}
              </p>
            </div>
            <Button variant="outline" size="icon" asChild>
              <Link href={mode === "admin" ? "/admin/messages" : "/messages"}>
                <MessageSquare className="size-4" />
                <span className="sr-only">Messages</span>
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href={mode === "admin" ? "/admin/schedule" : "/live-calls"}>
                <Bell className="size-4" />
                <span className="sr-only">Notifications</span>
              </Link>
            </Button>
            <Badge className={cn("hidden sm:inline-flex", mode === "admin" && "bg-blue-700")}>
              {mode === "admin" ? "Admin" : "Active"}
            </Badge>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4.5rem)] bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
