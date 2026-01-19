'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wrench, Sparkles, Home, User, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Dummy Header */}
      <nav className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            <span className="text-xl font-bold">TaaS</span>
          </div>

          {/* Center Navigation Links */}
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/technicians">
              <Button variant="ghost" size="sm">
                <Wrench className="mr-2 h-4 w-4" />
                Technicians
              </Button>
            </Link>
          </div>

          {/* Right Side - Admin Login & Theme Toggle */}
          <div className="flex items-center gap-2">
            <Link href="/admin/login">
              <Button variant="default">
                <Shield className="mr-0 h-4 w-4" />
                <span>I'm an Admin</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="container mx-auto max-w-5xl">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Connecting Clients with Skilled Technicians</span>
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Find Your Perfect
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {' '}Technician
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
              Whether you're looking for home services or offering your expertise, 
              we connect clients with skilled technicians in your area.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login">
                <Button size="lg" className="group w-full sm:w-auto">
                  <User className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                  I'm a Client
                </Button>
              </Link>
              <Link href="/technician/login">
                <Button size="lg" variant="outline" className="group w-full sm:w-auto">
                  <Wrench className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                  I'm a Technician
                </Button>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">For Clients</h3>
              <p className="text-sm text-muted-foreground">
                Browse skilled technicians, read reviews, and book services that match your needs.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">For Technicians</h3>
              <p className="text-sm text-muted-foreground">
                Showcase your skills, manage bookings, and grow your client base.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">AI-Powered Matching</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized recommendations based on your specific needs and requirements.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
