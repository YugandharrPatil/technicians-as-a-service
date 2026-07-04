"use client";

import { syncUserAction } from "@/actions/client-db";
import type { User as DbUser, UserRole } from "@/lib/types/database";
import { useClerk, useUser } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type AuthContextType = {
	user: { id: string; email: string; displayName: string; photoURL: string | null } | null;
	dbUser: DbUser | null;
	loading: boolean;
	signOut: () => Promise<void>;
	syncUser: (role?: UserRole) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const { user: clerkUser, isLoaded } = useUser();
	const { signOut: clerkSignOut } = useClerk();
	const [dbUser, setDbUser] = useState<DbUser | null>(null);
	const [syncing, setSyncing] = useState(false);

	const user = clerkUser
		? {
				id: clerkUser.id,
				email: clerkUser.primaryEmailAddress?.emailAddress || "",
				displayName: clerkUser.fullName || clerkUser.firstName || "",
				photoURL: clerkUser.imageUrl || null,
			}
		: null;

	const syncUser = useCallback(
		async (role?: UserRole) => {
			if (!clerkUser || syncing) return;

			setSyncing(true);
			try {
				const userId = clerkUser.id;
				const email = clerkUser.primaryEmailAddress?.emailAddress || "";
				const displayName = clerkUser.fullName || clerkUser.firstName || "";

				const result = await syncUserAction({
					id: userId,
					email,
					displayName,
					role,
				});

				setDbUser(result.user);
			} catch (error) {
				console.error("Error syncing user:", error);
			} finally {
				setSyncing(false);
			}
		},
		[clerkUser, syncing],
	);

	// Auto-sync user when Clerk auth state changes
	useEffect(() => {
		if (isLoaded && clerkUser) {
			syncUser();
		} else if (isLoaded && !clerkUser) {
			setDbUser(null);
		}
	}, [isLoaded, clerkUser?.id]);

	const signOut = async () => {
		setDbUser(null);
		await clerkSignOut();
	};

	const loading = !isLoaded;

	return <AuthContext.Provider value={{ user, dbUser, loading, signOut, syncUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
