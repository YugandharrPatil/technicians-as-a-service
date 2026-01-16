import { AdminGate } from '@/components/auth/admin-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Wrench } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <AdminGate>
      <div className="container mx-auto p-4">
        <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Bookings</CardTitle>
              </div>
              <CardDescription>Manage all bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/bookings">
                <Button className="w-full">View Bookings</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                <CardTitle>Technicians</CardTitle>
              </div>
              <CardDescription>Manage technician profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/technicians">
                <Button className="w-full">Manage Technicians</Button>
              </Link>
              <Link href="/admin/seed">
                <Button variant="outline" className="w-full">Seed Dummy Data</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>Clients</CardTitle>
              </div>
              <CardDescription>View all clients</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/clients">
                <Button className="w-full">View Clients</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGate>
  );
}
