'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './navbar';

export function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't render navbar on admin or technician pages (they have their own navbars)
  // Note: /technicians (catalogue) should show Navbar, but /technician/* (dashboard) should not
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/technician/')) {
    return null;
  }
  
  // Show main Navbar for all other pages (home, /technicians catalogue, /login, etc.)
  return <Navbar />;
}
