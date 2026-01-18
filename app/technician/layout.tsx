import { TechnicianNavbar } from '@/components/technician-navbar';

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TechnicianNavbar />
      {children}
    </>
  );
}
