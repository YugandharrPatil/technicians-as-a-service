'use client';

import { AdminGate } from '@/components/auth/admin-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export default function SeedPage() {
  return (
    <AdminGate>
      <SeedContent />
    </AdminGate>
  );
}

function SeedContent() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeed = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/seed-technicians', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Success: ${data.message}`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Error seeding technicians');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Seed Dummy Technicians (Optional)</CardTitle>
          <CardDescription>
            Helper to create sample technician data. Technicians should be created manually in Firestore or through the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleSeed} disabled={loading}>
              {loading ? 'Seeding...' : 'Seed Technicians'}
            </Button>
            {message && (
              <div className={`text-sm ${message.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
