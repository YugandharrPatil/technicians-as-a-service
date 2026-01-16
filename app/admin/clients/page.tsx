'use client';

import { useEffect, useState } from 'react';
import { AdminGate } from '@/components/auth/admin-gate';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { User } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminClientsPage() {
  return (
    <AdminGate>
      <AdminClientsContent />
    </AdminGate>
  );
}

function AdminClientsContent() {
  const [clients, setClients] = useState<(User & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    if (!db) return;
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const clientsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (User & { id: string })[];

      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-3xl font-bold">Clients</h1>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No clients found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <CardTitle>{client.displayName || 'No Name'}</CardTitle>
                <CardDescription>{client.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/admin/clients/${client.id}`}>
                  <Button variant="outline" className="w-full">
                    View Profile
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
