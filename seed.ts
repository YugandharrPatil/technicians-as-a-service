import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env manually BEFORE importing db (which reads process.env at module init)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, ".env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

async function seed() {
  // Dynamic import so env vars are set before the db module initialises
  const { db } = await import("./src/db");
  const { taasUsers, taasTechnicians, taasBookings, taasChats, taasReviews } = await import("./src/db/schema");

  console.log("🌱 Seeding database...");
  console.log("  DATABASE_URL:", process.env.DATABASE_URL);

  // 1. Users
  await db.insert(taasUsers).values([
    {
      id: "client_user_1",
      email: "alice@example.com",
      display_name: "Alice Smith",
      role: "client",
      roles: ["client"],
      rating_avg: "0.0",
      rating_count: 0,
      created_at: "2026-04-01 16:33:42",
    },
    {
      id: "client_user_2",
      email: "bob@example.com",
      display_name: "Bob Jones",
      role: "client",
      roles: ["client"],
      rating_avg: "0.0",
      rating_count: 0,
      created_at: "2026-04-01 16:33:42",
    },
    {
      id: "tech_user_1",
      email: "charlie@example.com",
      display_name: "Charlie Plumber",
      role: "technician",
      roles: ["client", "technician"],
      rating_avg: "0.0",
      rating_count: 0,
      created_at: "2026-04-01 16:33:42",
    },
    {
      id: "tech_user_2",
      email: "david@example.com",
      display_name: "David Spark",
      role: "technician",
      roles: ["client", "technician"],
      rating_avg: "0.0",
      rating_count: 0,
      created_at: "2026-04-01 16:33:42",
    },
    {
      id: "user_3BlP8SWSVFSJ4hgL1tsWx8U9cmW",
      email: "thisistheyugandhar@gmail.com",
      display_name: "Yugandhar Patil",
      role: "client",
      roles: ["client"],
      rating_avg: "0.0",
      rating_count: 0,
      created_at: "2026-04-01 16:33:50",
    },
    {
      id: "user_3C9gZ62eObSWJi6WB6G44z8kPTC",
      email: "admin@taas.com",
      display_name: "Admin",
      role: "client",
      roles: ["client"],
      rating_avg: "0.0",
      rating_count: 0,
      created_at: "2026-04-10 06:46:53",
    },
  ]).onConflictDoNothing();
  console.log("✅ Users seeded");

  // 2. Technicians
  await db.insert(taasTechnicians).values([
    {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "tech_user_1",
      name: "Charlie Plumber",
      job_types: ["plumber", "maintenance"],
      bio: "Experienced plumber with 10 years of fixing pipes and leaks.",
      tags: ["pipes", "leaks", "water heater"],
      cities: ["New York", "Brooklyn"],
      rating_avg: "4.8",
      rating_count: 15,
      is_visible: true,
      photo_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Charlie",
      embedding: null,
      created_at: "2026-04-01 16:33:42",
      updated_at: "2026-04-01 16:33:42",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      user_id: "tech_user_2",
      name: "David Spark",
      job_types: ["electrician"],
      bio: "Licensed electrician specializing in home wiring and panel upgrades.",
      tags: ["wiring", "panels", "lighting"],
      cities: ["New York", "Queens"],
      rating_avg: "4.9",
      rating_count: 32,
      is_visible: true,
      photo_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=David",
      embedding: null,
      created_at: "2026-04-01 16:33:42",
      updated_at: "2026-04-01 16:33:42",
    },
  ]).onConflictDoNothing();
  console.log("✅ Technicians seeded");

  // 3. Bookings
  await db.insert(taasBookings).values([
    {
      id: "33333333-3333-3333-3333-333333333333",
      client_id: "client_user_1",
      technician_id: "11111111-1111-1111-1111-111111111111",
      service_type: "plumber",
      problem_description: "My kitchen sink is leaking heavily from the P-trap.",
      address: "123 Main St, Apt 4B, New York, NY",
      preferred_date_time: "2026-04-03 16:33:42",
      status: "requested",
      negotiated_price: null,
      negotiated_date_time: null,
      accepted_at: null,
      completed_by_client: false,
      completed_by_technician: false,
      lead_contacted: false,
      lead_closed: false,
      created_at: "2026-04-01 16:33:42",
      updated_at: "2026-04-01 16:33:42",
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      client_id: "client_user_2",
      technician_id: "22222222-2222-2222-2222-222222222222",
      service_type: "electrician",
      problem_description: "Need to install 4 new ceiling lights in the living room.",
      address: "456 Elm St, Queens, NY",
      preferred_date_time: "2026-04-06 16:33:42",
      status: "accepted",
      negotiated_price: null,
      negotiated_date_time: null,
      accepted_at: null,
      completed_by_client: false,
      completed_by_technician: false,
      lead_contacted: false,
      lead_closed: false,
      created_at: "2026-04-01 16:33:42",
      updated_at: "2026-04-01 16:33:42",
    },
  ]).onConflictDoNothing();
  console.log("✅ Bookings seeded");

  // 4. Chats
  await db.insert(taasChats).values([
    {
      id: "4feafed5-ce20-4265-ad59-c195286ae81d",
      booking_id: "44444444-4444-4444-4444-444444444444",
      sender_id: "client_user_2",
      sender_type: "client",
      message: "Hi David, do you provide the light fixtures or should I buy them?",
      offer_price: null,
      offer_date_time: null,
      created_at: "2026-04-01 16:33:42",
    },
    {
      id: "bf0550b1-9505-43c5-aedd-0579c3a26417",
      booking_id: "44444444-4444-4444-4444-444444444444",
      sender_id: "tech_user_2",
      sender_type: "technician",
      message: "Hello Bob, it is best if you purchase the fixtures so they match your decor. Let me know if you need recommendations.",
      offer_price: null,
      offer_date_time: null,
      created_at: "2026-04-01 16:33:42",
    },
  ]).onConflictDoNothing();
  console.log("✅ Chats seeded");

  // 5. Reviews
  await db.insert(taasReviews).values([
    {
      id: "5af1db59-2648-4bd0-b2c1-0e2983a31ab6",
      booking_id: "33333333-3333-3333-3333-333333333333",
      client_id: "client_user_1",
      technician_id: "11111111-1111-1111-1111-111111111111",
      reviewer_id: "client_user_1",
      reviewee_id: "tech_user_1",
      stars: 5,
      text: "Charlie did a great job fixing the leak. Highly recommended!",
      created_at: "2026-04-01 16:33:42",
    },
  ]).onConflictDoNothing();
  console.log("✅ Reviews seeded");

  console.log("🎉 Seeding complete!");
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
