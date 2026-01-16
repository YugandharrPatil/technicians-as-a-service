import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Search } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold">Find Your Perfect Technician</h2>
            <p className="text-muted-foreground text-lg">
              Browse our directory or describe your problem for AI-powered recommendations
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <Link href="/technicians">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Browse Technicians</CardTitle>
                  <CardDescription>
                    Explore our catalogue of skilled technicians. Filter by service type, location, and ratings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Browse Catalogue</Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <Link href="/ai-suggestion">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Wrench className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Describe Your Problem</CardTitle>
                  <CardDescription>
                    Tell us what you need help with, and we'll match you with the best technicians for your job.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Get Suggestions</Button>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
