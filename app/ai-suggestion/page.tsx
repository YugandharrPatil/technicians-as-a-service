'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AISuggestionPage() {
  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Technician Suggestions</CardTitle>
          <CardDescription>
            This feature will be available in a future update. For now, please browse our technician catalogue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/technicians">Browse Technicians</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
