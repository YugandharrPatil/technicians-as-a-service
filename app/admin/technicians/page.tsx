'use client';

import { useEffect, useState } from 'react';
import { AdminGate } from '@/components/auth/admin-gate';
import type { Technician } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function AdminTechniciansPage() {
  return (
    <AdminGate>
      <AdminTechniciansContent />
    </AdminGate>
  );
}

function AdminTechniciansContent() {
  const [technicians, setTechnicians] = useState<(Technician & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTechnicians();
  }, []);

  async function loadTechnicians() {
    try {
      const response = await fetch('/api/admin/technicians');
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.technicians);
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Technicians</h1>
        <Link href="/admin/technicians/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Technician
          </Button>
        </Link>
      </div>

      {technicians.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No technicians yet. Create your first technician profile.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => (
            <Card key={tech.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tech.name}</CardTitle>
                  {tech.isVisible ? (
                    <Badge variant="default">Visible</Badge>
                  ) : (
                    <Badge variant="secondary">Hidden</Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">{tech.bio}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(tech.jobTypes) && tech.jobTypes.length > 0 ? (
                      tech.jobTypes.map((type) => (
                        <Badge key={type} variant="outline">
                          {type}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No job types</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cities: {Array.isArray(tech.cities) && tech.cities.length > 0 
                      ? tech.cities.join(', ') 
                      : 'None'}
                  </p>
                </div>
                <Link href={`/admin/technicians/${tech.id}`}>
                  <Button variant="outline" className="w-full">
                    Edit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
