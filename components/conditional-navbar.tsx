'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './navbar';

export function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't render navbar on home page, admin pages, or technician pages
  // Note: /technicians (catalogue) should show Navbar, but /technician/* (dashboard) should not
  if (pathname === '/' || pathname?.startsWith('/admin') || pathname?.startsWith('/technician/')) {
    return null;
  }
  
  // Show main Navbar for all other pages (/technicians catalogue, /login, etc.)
  return <Navbar />;
}
