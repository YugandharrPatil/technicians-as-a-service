import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const dummyTechnicians = [
  { name: 'John Smith', job_types: ['plumber'], bio: 'Experienced plumber with 15 years of expertise in residential and commercial plumbing. Specializes in leak repairs, pipe installations, and bathroom renovations.', tags: ['bathroom fittings', 'leak repair', 'pipe installation', 'water heater'], cities: ['New York', 'Brooklyn', 'Queens'], is_visible: true },
  { name: 'Sarah Johnson', job_types: ['electrician'], bio: 'Licensed electrician providing safe and reliable electrical services. Expert in wiring, panel upgrades, and smart home installations.', tags: ['AC wiring', 'panel upgrade', 'smart home', 'outlet installation'], cities: ['Los Angeles', 'San Francisco', 'San Diego'], is_visible: true },
  { name: 'Mike Davis', job_types: ['carpenter'], bio: 'Master carpenter specializing in custom furniture, cabinet making, and home renovations. Quality craftsmanship guaranteed.', tags: ['furniture repair', 'cabinet making', 'custom furniture', 'trim work'], cities: ['Chicago', 'Milwaukee', 'Detroit'], is_visible: true },
  { name: 'Emily Chen', job_types: ['plumber', 'electrician'], bio: 'Multi-skilled technician offering both plumbing and electrical services. Perfect for home renovation projects requiring both trades.', tags: ['bathroom renovation', 'kitchen wiring', 'fixture installation', 'outlet repair'], cities: ['Seattle', 'Portland', 'Vancouver'], is_visible: true },
  { name: 'Robert Wilson', job_types: ['plumber'], bio: 'Emergency plumber available 24/7. Quick response time for urgent repairs including burst pipes, clogged drains, and water leaks.', tags: ['emergency service', 'drain cleaning', 'burst pipe repair', 'sewer line'], cities: ['Miami', 'Tampa', 'Orlando'], is_visible: true },
  { name: 'Lisa Anderson', job_types: ['electrician'], bio: 'Residential electrician focused on safety and code compliance. Specializes in home rewiring, lighting design, and electrical troubleshooting.', tags: ['home rewiring', 'lighting design', 'electrical troubleshooting', 'GFCI installation'], cities: ['Boston', 'Cambridge', 'Worcester'], is_visible: true },
  { name: 'David Martinez', job_types: ['carpenter'], bio: 'Professional carpenter with expertise in deck building, fence installation, and structural repairs. Licensed and insured.', tags: ['deck building', 'fence installation', 'structural repair', 'siding'], cities: ['Dallas', 'Houston', 'Austin'], is_visible: true },
  { name: 'Jennifer Brown', job_types: ['plumber'], bio: 'Female plumber providing professional plumbing services. Specializes in bathroom and kitchen installations with attention to detail.', tags: ['bathroom installation', 'kitchen plumbing', 'faucet repair', 'toilet installation'], cities: ['Phoenix', 'Tucson', 'Scottsdale'], is_visible: true },
  { name: 'James Taylor', job_types: ['electrician', 'carpenter'], bio: 'Handyman offering electrical and carpentry services. Ideal for small projects and repairs around the house.', tags: ['handyman', 'small repairs', 'electrical fixes', 'woodwork'], cities: ['Denver', 'Boulder', 'Colorado Springs'], is_visible: true },
  { name: 'Amanda White', job_types: ['carpenter'], bio: 'Custom woodworker creating beautiful pieces for your home. From built-in shelving to custom tables, quality is guaranteed.', tags: ['custom woodwork', 'built-in shelving', 'custom tables', 'finishing work'], cities: ['Atlanta', 'Savannah', 'Augusta'], is_visible: true },
];

export async function POST() {
  try {
    await requireAdmin();
    const supabase = getSupabaseServiceClient();

    const { error } = await supabase.from('taas_technicians').insert(dummyTechnicians);
    if (error) throw error;

    return NextResponse.json({ success: true, message: `Created ${dummyTechnicians.length} technicians` });
  } catch (error) {
    console.error('Error seeding technicians:', error);
    return NextResponse.json({ error: 'Failed to seed technicians' }, { status: 500 });
  }
}
