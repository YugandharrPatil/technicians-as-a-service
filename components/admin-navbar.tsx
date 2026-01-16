'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wrench, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

export function AdminNavbar() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Wrench className="h-6 w-6" />
          <span className="text-xl font-bold">TaaS Admin</span>
        </Link>

        {/* Center Navigation Links */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          <Link href="/admin/dashboard">
            <Button 
              variant={pathname === '/admin/dashboard' ? 'secondary' : 'ghost'} 
              size="sm"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/bookings">
            <Button 
              variant={pathname?.startsWith('/admin/bookings') ? 'secondary' : 'ghost'} 
              size="sm"
            >
              Bookings
            </Button>
          </Link>
          <Link href="/admin/technicians">
            <Button 
              variant={pathname?.startsWith('/admin/technicians') ? 'secondary' : 'ghost'} 
              size="sm"
            >
              Technicians
            </Button>
          </Link>
          <Link href="/admin/clients">
            <Button 
              variant={pathname?.startsWith('/admin/clients') ? 'secondary' : 'ghost'} 
              size="sm"
            >
              Clients
            </Button>
          </Link>
        </div>

        {/* Right Side - Admin User Info */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'Admin'} />
                    <AvatarFallback>
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block">
                    {user.displayName || user.email?.split('@')[0] || 'Admin'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.displayName || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-primary font-medium mt-1">Administrator</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
