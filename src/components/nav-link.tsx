import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

type NavLinkProps = {
	label: string;
	href: string;
	isActive?: boolean;
	icon?: LucideIcon;
};

export default function NavLink({ label, href, isActive, icon: Icon }: NavLinkProps) {
	return (
		<Button asChild variant={isActive ? "outline" : "ghost"}>
			<Link href={href}>
				{Icon && <Icon />}
				{label}
			</Link>
		</Button>
	);
}
