# Technicians as a Service

A Next.js portfolio project for managing a local multi-service home services company. Built with Next.js, shadcn/ui, Tailwind CSS, Firebase (Auth, Firestore, Storage), and Pinecone for embeddings.

## Features

### Client Features
- **Authentication**: Sign up, login, logout
- **Technician Discovery**: Browse catalogue with filters (job type, city, rating, tags)
- **Booking Management**: Create bookings, view booking status and history
- **Reviews**: Leave reviews for completed bookings

### Admin Features
- **Admin Authentication**: Firebase Auth with custom claims
- **Technician Management**: Create, edit, and manage technician profiles
- **Booking Management**: View all bookings, update status, track leads
- **Client Management**: View all clients and their booking history
- **Embeddings**: Automatic embedding generation and Pinecone storage when technicians are created/updated

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Embeddings**: Google Gemini (text-embedding-004)
- **Vector Database**: Pinecone
- **Form Handling**: React Hook Form + Zod

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (JSON stringified service account key)
FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Google AI Studio API Key for Gemini embeddings
GOOGLE_API_KEY=your_google_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX_NAME=your_index_name
```

### 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Deploy Firestore security rules from `firestore.rules`
5. Create a service account and download the JSON key
6. Stringify the service account JSON and add it to `FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY`

### 4. Pinecone Setup

1. Create a Pinecone account at https://www.pinecone.io
2. Create an index with:
   - Dimensions: 768 (for text-embedding-004)
   - Metric: cosine
3. Get your API key and environment name
4. Add them to your `.env.local`

### 5. Google AI Studio Setup

1. Go to https://aistudio.google.com
2. Get your API key
3. Add it to your `.env.local`

### 6. Set Admin Custom Claims

To set an admin user, you'll need to use Firebase Admin SDK. Create a script or use Firebase Console Functions to set custom claims:

```typescript
// Example: Set admin claim for a user
await adminAuth.setCustomUserClaims(uid, { admin: true });
```

Or use the API endpoint `/api/admin/set-admin-claim` (requires admin authentication).

### 7. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
  ├── page.tsx                    # Home page
  ├── login/                      # Client login
  ├── signup/                     # Client signup
  ├── technicians/                # Technician catalogue
  ├── booking/                    # Booking pages
  ├── account/                    # Client account pages
  ├── admin/                      # Admin pages
  └── api/admin/                  # Admin API routes
lib/
  ├── firebase/                   # Firebase client & admin
  ├── auth/                       # Auth context & helpers
  ├── pinecone.ts                # Pinecone client
  ├── embeddings.ts               # Gemini embeddings
  └── types/                      # TypeScript types
components/
  ├── ui/                         # shadcn/ui components
  └── auth/                       # Auth gate components
firestore.rules                   # Firestore security rules
```

## Key Features Implementation

### Embeddings Write-Through

When a technician is created or updated via the admin panel:
1. Technician data is saved to Firestore
2. Embedding text is built from name, jobTypes, bio, tags, cities
3. Gemini generates the embedding vector
4. Vector is upserted to Pinecone with metadata
5. Embedding metadata is stored back in Firestore

### Security Rules

- Clients can only read/write their own bookings
- Clients can only create reviews for their own completed bookings
- Admins have full CRUD access to technicians and bookings
- Technicians are only visible if `isVisible` is true

## Next Steps (Future Enhancements)

- AI-powered technician recommendation UI
- Email notifications
- Calendar/availability system
- Rating aggregation and display
- File uploads for technician photos
- Advanced filtering and search

## License

MIT
