"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton, useUser } from "@clerk/nextjs";
import { type LucideIcon, Shield, User, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavLink from "./nav-link";

type LinkType = Record<"guest" | "user" | "technician" | "admin", { id: string; label: string; href: string; icon?: LucideIcon }[]>;

const LINKS: LinkType = {
	guest: [
		{ id: "login", label: "Client Sign In", href: "/login", icon: User },
		{ id: "technician-login", label: "Technician Sign In", href: "/technician/login", icon: Wrench },
		{ id: "admin-login", label: "Admin Portal", href: "/admin/login", icon: Shield },
	],
	user: [
		{ id: "technicians", label: "Technicians", href: "/technicians" },
		{ id: "bookings", label: "Bookings", href: "/account/bookings" },
	],
	technician: [
		{ id: "dashboard", label: "Dashboard", href: "/technician/dashboard" },
		{ id: "bookings", label: "Bookings", href: "/technician/bookings" },
		{ id: "profile", label: "Profile", href: "/technician/profile" },
	],
	admin: [
		{ id: "dashboard", label: "Dashboard", href: "/admin/dashboard" },
		{ id: "technicians", label: "Technicians", href: "/admin/technicians" },
		{ id: "bookings", label: "Bookings", href: "/admin/bookings" },
		{ id: "clients", label: "Clients", href: "/admin/clients" },
	],
};

export function Navbar() {
	const pathname = usePathname();
	const { user, isSignedIn, isLoaded } = useUser();

	if (!isLoaded) return null;

	const isAdmin = user?.publicMetadata?.role === "admin" && isSignedIn;
	const isTechnician = user?.publicMetadata?.role === "technician" && isSignedIn;
	const isUser = isSignedIn && !isTechnician && !isAdmin;

	return (
		<nav className="sticky top-0 z-50 border-b bg-white/75 backdrop-blur-md dark:bg-background/75">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				{/* LEFT LOGO LINK */}
				<Link href={isAdmin ? "/admin/dashboard" : isTechnician ? "/technician/dashboard" : isSignedIn ? "/technicians" : "/"} className="flex items-center gap-2 text-xl font-bold tracking-tight">
					<span>TaaS</span>
					{isAdmin && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] uppercase tracking-widest text-purple-800 dark:bg-purple-900 dark:text-purple-300">Admin</span>}
					{isTechnician && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] uppercase tracking-widest text-blue-800 dark:bg-blue-900 dark:text-blue-300">Technician</span>}
				</Link>

				<div className="flex items-center gap-4">
					{(isUser ? LINKS.user : isTechnician ? LINKS.technician : isAdmin ? LINKS.admin : !isSignedIn ? LINKS.guest : []).map((link) => (
						<NavLink key={link.id} label={link.label} href={link.href} isActive={pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href + "/"))} icon={link.icon} />
					))}
					<ThemeToggle />
					{isSignedIn && <UserButton />}
				</div>
			</div>
		</nav>
	);
}
