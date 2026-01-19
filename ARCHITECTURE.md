# Technicians as a Service - Complete Architecture Overview

## Table of Contents
1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Authentication System](#authentication-system)
5. [Database Structure](#database-structure)
6. [User Flows](#user-flows)
7. [Booking System](#booking-system)
8. [Chat System](#chat-system)
9. [Review & Rating System](#review--rating-system)
10. [Storage System](#storage-system)
11. [Admin Features](#admin-features)
12. [AI/Embeddings System](#aiembeddings-system)
13. [Security & Access Control](#security--access-control)
14. [File Structure](#file-structure)

---

## Application Overview

**Technicians as a Service** is a Next.js-based platform that connects clients with skilled home service technicians. The application supports three distinct user roles:

- **Clients**: Browse technicians, create bookings, communicate via chat, and leave reviews
- **Technicians**: Manage profiles, accept/reject bookings, communicate with clients, and review clients
- **Admins**: Manage technicians, bookings, clients, and system configuration

The application uses Firebase for authentication, database, and storage, with Pinecone for vector search capabilities.

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS
- **State Management**: React Context API, TanStack Query (React Query)
- **Form Handling**: React Hook Form + Zod validation
- **Notifications**: Sonner (toast notifications)

### Backend & Services
- **Authentication**: Firebase Auth (Google OAuth)
- **Database**: Firestore (NoSQL)
- **Storage**: Firebase Storage (for technician photos)
- **Vector Database**: Pinecone (for AI-powered technician matching)
- **AI/Embeddings**: Google Gemini (text-embedding-004 model)
- **Server Actions**: Next.js API Routes

### Development Tools
- **TypeScript**: Type safety
- **ESLint**: Code linting
- **pnpm**: Package manager

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Client UI  │  │ Technician UI│  │   Admin UI   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              App Router (Pages)                       │  │
│  │  • Home, Login, Signup                               │  │
│  │  • Technicians Catalogue                             │  │
│  │  • Booking Management                                │  │
│  │  • Chat Interface                                    │  │
│  │  • Admin Dashboard                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes                               │  │
│  │  • /api/admin/* (Admin operations)                    │  │
│  │  • /api/technician/* (Technician operations)         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Context & Hooks                    │  │
│  │  • AuthContext (Authentication state)                │  │
│  │  • Custom hooks (useBooking, useChat, etc.)          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Firebase Auth│  │  Firestore   │  │Firebase Storage│
│              │  │  (Database)  │  │  (Images)     │
└──────────────┘  └──────────────┘  └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Pinecone   │
                    │ (Vector DB)  │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │Google Gemini  │
                    │(Embeddings)   │
                    └──────────────┘
```

---

## Authentication System

### Overview
The application uses Firebase Authentication with Google OAuth as the primary authentication method. User roles are stored in Firestore, not as Firebase Auth custom claims (except for admins).

### Authentication Flow

#### 1. Client Authentication (`/login`)

**Entry Point**: Homepage → "I'm a Client" button → `/login`

**Flow**:
```
1. User clicks "I'm a Client" on homepage
2. Redirected to /login page
3. User clicks "Sign in with Google"
4. Firebase Auth popup opens (Google OAuth)
5. User selects Google account
6. signInWithGoogle('client') is called:
   - Creates/updates user document in Firestore 'users' collection
   - Sets role: 'client'
   - Stores: email, displayName, createdAt
7. Redirected to /technicians (catalogue page)
```

**Key Code Location**: `lib/auth/context.tsx`
- `signInWithGoogle(role)` function handles role assignment
- Creates user document in Firestore with specified role
- Updates existing user's role if different

#### 2. Technician Authentication (`/technician/login`)

**Entry Point**: Homepage → "I'm a Technician" button → `/technician/login`

**Flow**:
```
1. User clicks "I'm a Technician" on homepage
2. Redirected to /technician/login page
3. User clicks "Sign in with Google"
4. Firebase Auth popup opens
5. signInWithGoogle('technician') is called:
   - Creates/updates user document with role: 'technician'
6. System checks if technician profile exists:
   - If NO profile → Redirect to /technician/profile (create profile)
   - If profile exists → Redirect to /technician/dashboard
```

**Key Code Location**: `app/technician/login/page.tsx`
- Checks for existing technician profile in Firestore
- Redirects based on profile existence

#### 3. Admin Authentication (`/admin/login`)

**Flow**:
```
1. Admin signs in with Google
2. System checks Firebase Auth custom claims for 'admin: true'
3. If admin claim exists → Redirect to /admin/dashboard
4. Admin claims are set via Firebase Admin SDK (not in Firestore)
```

**Key Code Location**: `lib/auth/admin.ts`
- Uses Firebase Admin SDK to verify custom claims
- Admin status stored in JWT token, not Firestore

### Authentication State Management

**AuthContext** (`lib/auth/context.tsx`):
- Provides `user`, `loading`, `signInWithGoogle()`, `signOut()` globally
- Uses Firebase `onAuthStateChanged` listener
- Optimized to prevent unnecessary re-renders (compares UIDs)

**Auth Gates**:
- `AuthGate`: Protects client routes
- `TechnicianGate`: Protects technician routes (checks role + profile)
- `AdminGate`: Protects admin routes (checks custom claims)

---

## Database Structure

### Firestore Collections

#### 1. `users` Collection
**Purpose**: Stores user authentication and profile data

**Document Structure**:
```typescript
{
  email: string;
  displayName: string;
  role: 'client' | 'technician';
  ratingAvg?: number;        // Average rating received
  ratingCount?: number;      // Number of ratings received
  createdAt: Timestamp;
}
```

**Access Rules**:
- Users can read/update their own document
- Admins can read all users

#### 2. `technicians` Collection
**Purpose**: Stores technician profiles (public catalogue data)

**Document Structure**:
```typescript
{
  userId?: string;           // Link to users collection (optional)
  name: string;
  jobTypes: JobType[];      // ['plumber', 'electrician', etc.]
  bio: string;
  tags: string[];           // ['licensed', 'insured', '24/7', etc.]
  cities: string[];          // Serviceable cities
  ratingAvg?: number;
  ratingCount?: number;
  isVisible: boolean;        // Whether shown in catalogue
  photoUrl?: string;         // Firebase Storage URL
  embedding?: {
    provider: 'gemini';
    model: string;
    pineconeId: string;
    updatedAt: Timestamp;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

**Access Rules**:
- Anyone can read visible technicians (`isVisible: true`)
- Technicians can read their own document
- Admins can create/update/delete all technicians
- Technicians can update their own document (limited fields)

#### 3. `bookings` Collection
**Purpose**: Stores booking requests and status

**Document Structure**:
```typescript
{
  clientId: string;           // User ID of client
  technicianId: string;      // Technician document ID
  serviceType: string;
  problemDescription: string;
  address: string;
  preferredDateTime: Timestamp;
  status: BookingStatus;      // 'requested' | 'accepted' | 'rejected' | 'confirmed' | 'completed'
  negotiatedPrice?: number;
  negotiatedDateTime?: Timestamp;
  acceptedAt?: Timestamp;
  completedByClient?: boolean;
  completedByTechnician?: boolean;
  lead: {
    contacted: boolean;
    closed: boolean;
  };
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**Status Flow**:
```
requested → accepted/rejected
accepted → confirmed (after negotiation)
confirmed → completed (when both parties mark as done)
```

**Access Rules**:
- Clients can read their own bookings
- Technicians can read bookings assigned to them
- Clients can create bookings for themselves
- Clients can update bookings (limited - can't change status from requested)
- Technicians can update bookings (can accept/reject, update status)
- Admins can read/update all bookings

#### 4. `chatMessages` Collection
**Purpose**: Stores chat messages between clients and technicians

**Document Structure**:
```typescript
{
  bookingId: string;
  senderId: string;          // User ID (clientId or technician userId)
  senderType: 'client' | 'technician';
  message: string;
  createdAt: Timestamp;
  offer?: {                  // Optional price/time offer
    price: number;
    dateTime: Timestamp;
  };
}
```

**Access Rules**:
- Users can read messages for bookings they're involved in
- Users can create messages for bookings they're involved in
- Admins can read all messages

**Index Required**: Composite index on `bookingId` (ASC) and `createdAt` (ASC)

#### 5. `reviews` Collection
**Purpose**: Stores mutual reviews between clients and technicians

**Document Structure**:
```typescript
{
  bookingId: string;
  clientId: string;
  technicianId: string;
  reviewerId: string;        // User ID of person giving review
  revieweeId: string;        // User ID of person being reviewed
  stars: number;             // 1-5 rating
  text?: string;             // Optional review text
  createdAt: Timestamp;
}
```

**Access Rules**:
- Anyone can read reviews (public)
- Clients can create reviews for completed bookings (reviewing technician)
- Technicians can create reviews for completed bookings (reviewing client)
- Users can update their own reviews
- Admins can read/update all reviews

---

## User Flows

### Client Flow

#### 1. Registration & Login
```
Homepage → Click "I'm a Client" → /login → Google Sign In → /technicians
```

#### 2. Browse Technicians
```
/technicians → Filter by:
  - Job Type (plumber, electrician, etc.)
  - City
  - Rating
  - Tags
→ View technician details → Click "Book Now"
```

#### 3. Create Booking
```
/booking/create?technicianId=xxx → Fill form:
  - Service Type
  - Problem Description
  - Address
  - Preferred Date & Time
→ Submit → Booking created with status 'requested'
→ Redirected to /account/bookings
```

#### 4. Booking Status Tracking
```
/booking/status/[id] → View:
  - Current status
  - Technician details
  - Chat button (if accepted/confirmed)
  - Mark as Completed button (if confirmed)
```

#### 5. Chat & Negotiation
```
/chat/[bookingId] → Real-time chat:
  - Send messages
  - Make price/time offers
  - Accept/reject offers
→ Offers update booking.negotiatedPrice and booking.negotiatedDateTime
```

#### 6. Review After Completion
```
When both parties mark booking as completed:
→ Review dialog automatically opens
→ Rate technician (1-5 stars)
→ Write optional review text
→ Submit → Rating updates technician.ratingAvg and technician.ratingCount
```

### Technician Flow

#### 1. Registration & Profile Creation
```
Homepage → Click "I'm a Technician" → /technician/login → Google Sign In
→ Check if profile exists:
  - NO → /technician/profile (create profile)
  - YES → /technician/dashboard
```

#### 2. Profile Creation/Update
```
/technician/profile → Fill form:
  - Name
  - Job Types (multi-select)
  - Bio
  - Tags (multi-select)
  - Cities (multi-select)
  - Upload Photo (Firebase Storage)
  - Visibility toggle
→ Submit → Profile saved to Firestore
→ Redirected to /technician/dashboard
```

**Photo Upload Process**:
1. User selects image file (< 5MB)
2. File validated (type, size)
3. Filename sanitized: `technicians/{timestamp}_{sanitized_name}`
4. Uploaded to Firebase Storage
5. Download URL retrieved
6. URL stored in `technician.photoUrl`

#### 3. Dashboard & Booking Management
```
/technician/dashboard → View:
  - All bookings assigned to technician
  - Filter by status
  - Accept/Reject buttons for 'requested' bookings
```

#### 4. Booking Details & Actions
```
/technician/bookings/[id] → View:
  - Booking details
  - Client information
  - Accept/Reject (if requested)
  - Open Chat (if accepted/confirmed)
  - Mark as Completed (if confirmed)
```

#### 5. Chat & Negotiation
```
Same as client chat flow
→ Technician can make counter-offers
→ Accept client offers
```

#### 6. Review Client After Completion
```
When both parties mark booking as completed:
→ Review dialog automatically opens
→ Rate client (1-5 stars)
→ Write optional review text
→ Submit → Rating updates user.ratingAvg and user.ratingCount
```

### Admin Flow

#### 1. Login
```
/admin/login → Google Sign In → Verify admin custom claim → /admin/dashboard
```

#### 2. Dashboard
```
/admin/dashboard → Overview cards:
  - Bookings management
  - Technicians management
  - Clients management
```

#### 3. Technician Management
```
/admin/technicians → List all technicians
→ Create new technician (/admin/technicians/create)
→ Edit technician (/admin/technicians/[id])
→ When creating/updating:
  - Profile data saved to Firestore
  - Embedding generated (Gemini)
  - Vector stored in Pinecone
  - Embedding metadata saved back to Firestore
```

#### 4. Booking Management
```
/admin/bookings → List all bookings
→ View booking details (/admin/bookings/[id])
→ Update status
→ Track lead status (contacted, closed)
```

#### 5. Client Management
```
/admin/clients → List all clients
→ View client details (/admin/clients/[id])
→ View booking history
```

---

## Booking System

### Booking Lifecycle

```
┌──────────┐
│requested │ ← Client creates booking
└────┬─────┘
     │
     ├───→ rejected (technician rejects)
     │
     └───→ accepted (technician accepts)
            │
            ├───→ confirmed (after negotiation/chat)
            │      │
            │      └───→ completed (both parties mark as done)
            │             │
            │             └───→ Reviews exchanged
```

### Booking States

1. **requested**: Initial state when client creates booking
   - Client can view booking
   - Technician can accept/reject
   - No chat available yet

2. **accepted**: Technician accepts the request
   - Chat becomes available
   - Both parties can negotiate price/time
   - Status can change to 'confirmed' after negotiation

3. **rejected**: Technician rejects the request
   - Booking is closed
   - No further actions available

4. **confirmed**: Both parties agree on terms
   - Negotiated price and date/time are set
   - Both parties can mark as completed

5. **completed**: Both parties have marked as completed
   - `completedByClient: true`
   - `completedByTechnician: true`
   - `status: 'completed'`
   - Review dialog opens automatically

### Booking Creation Process

**File**: `app/booking/create/page.tsx`

1. Client selects technician from catalogue
2. Redirected to `/booking/create?technicianId=xxx`
3. Form validation (Zod schema):
   - Service type (required)
   - Problem description (min 10 chars)
   - Address (min 5 chars)
   - Preferred date (required)
   - Preferred time (required)
4. On submit:
   ```typescript
   await addDoc(collection(db, 'bookings'), {
     clientId: user.uid,
     technicianId,
     serviceType,
     problemDescription,
     address,
     preferredDateTime,
     status: 'requested',
     lead: { contacted: false, closed: false },
     createdAt: new Date(),
   });
   ```
5. Redirected to `/account/bookings`

### Booking Updates

**Technician Accepts** (`app/technician/bookings/[id]/page.tsx`):
```typescript
await updateDoc(bookingRef, {
  status: 'accepted',
  acceptedAt: new Date(),
  updatedAt: new Date(),
});
```

**Technician Rejects**:
```typescript
await updateDoc(bookingRef, {
  status: 'rejected',
  updatedAt: new Date(),
});
```

**Mark as Completed** (Client):
```typescript
await updateDoc(bookingRef, {
  completedByClient: true,
  updatedAt: new Date(),
  // If technician also completed, set status to 'completed'
  ...(booking.completedByTechnician && { status: 'completed' }),
});
```

**Real-time Updates**: Both booking detail pages use Firestore `onSnapshot` listeners to detect status changes and automatically open review dialogs when bookings become completed.

---

## Chat System

### Architecture

**Real-time Communication**: Uses Firestore `onSnapshot` listeners for real-time message updates

**Key Files**:
- `lib/hooks/use-chat.ts`: Custom hook for chat functionality
- `app/chat/[bookingId]/page.tsx`: Chat UI component

### Chat Hook (`use-chat.ts`)

**Features**:
1. **Real-time Message Listening**:
   ```typescript
   const messagesQuery = query(
     collection(db, 'chatMessages'),
     where('bookingId', '==', bookingId),
     orderBy('createdAt', 'asc')
   );
   
   const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
     // Update messages state in real-time
   });
   ```

2. **Send Message**:
   ```typescript
   await addDoc(collection(db, 'chatMessages'), {
     bookingId,
     senderId: user.uid,
     senderType: 'client' | 'technician',
     message: text,
     createdAt: Timestamp.now(),
   });
   ```

3. **Send Offer** (price/time negotiation):
   ```typescript
   await addDoc(collection(db, 'chatMessages'), {
     // ... message fields
     offer: {
       price: number,
       dateTime: Timestamp,
     },
   });
   ```

### Chat UI Features

**File**: `app/chat/[bookingId]/page.tsx`

1. **Message Display**:
   - Shows sender name and type (client/technician)
   - Timestamps formatted
   - Auto-scrolls to bottom on new messages

2. **Offer Handling**:
   - Displays offer cards with price and date/time
   - "Accept Offer" button updates booking:
     ```typescript
     await updateDoc(bookingRef, {
       negotiatedPrice: offer.price,
       negotiatedDateTime: offer.dateTime,
       status: 'confirmed',
     });
     ```
   - "Reject Offer" button sends rejection message

3. **Access Control**:
   - Only client and assigned technician can access chat
   - Chat only available for bookings with status 'accepted' or 'confirmed'

### Chat Security

**Firestore Rules** (`firestore.rules`):
- Users can only read messages for bookings they're involved in
- Users can only create messages for bookings they're involved in
- Verification checks:
  - For clients: `booking.clientId == request.auth.uid`
  - For technicians: `technician.userId == request.auth.uid`

---

## Review & Rating System

### Overview

**Mutual Review System**: Both clients and technicians can review each other after a booking is completed.

### Review Flow

#### 1. Completion Detection

**Real-time Listener** (both client and technician booking pages):
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(bookingRef, async (snapshot) => {
    const bookingData = snapshot.data();
    
    // Check if booking just became completed
    if (bookingData.status === 'completed' && 
        bookingData.completedByClient && 
        bookingData.completedByTechnician) {
      
      // Check if user has already reviewed
      const reviewQuery = query(
        collection(db, 'reviews'),
        where('bookingId', '==', bookingId),
        where('reviewerId', '==', user.uid),
        where('revieweeId', '==', revieweeId)
      );
      
      const reviewSnap = await getDocs(reviewQuery);
      if (reviewSnap.empty) {
        // Open review dialog
        setShowReviewDialog(true);
      }
    }
  });
}, [bookingId, user]);
```

#### 2. Review Dialog

**Component**: `components/review-dialog.tsx`

**Features**:
- Star rating (1-5)
- Optional text review
- Checks for existing review (allows updates)
- Updates ratings after submission

**Review Submission**:
```typescript
// Create review document
await addDoc(collection(db, 'reviews'), {
  bookingId,
  clientId,
  technicianId,
  reviewerId: user.uid,
  revieweeId: technician.userId, // or client.id
  stars: rating,
  text: reviewText,
  createdAt: new Date(),
});

// Update ratings
await updateRatings(revieweeId, revieweeType, rating);
```

#### 3. Rating Calculation

**Function**: `updateRatings()` in `components/review-dialog.tsx`

**Process**:
1. Fetch all reviews for the reviewee
2. Calculate total stars and count
3. If updating existing review:
   - Subtract old rating
   - Add new rating
4. Calculate average: `totalStars / reviewCount`
5. Round to 1 decimal place
6. Update `ratingAvg` and `ratingCount` in:
   - `users` collection (for clients)
   - `technicians` collection (for technicians)

**Example**:
```typescript
// Technician has 3 reviews: 5, 4, 5 stars
// Total: 14, Count: 3
// Average: 4.67

// User adds new review: 5 stars
// Total: 19, Count: 4
// New Average: 4.75

await updateDoc(technicianRef, {
  ratingAvg: 4.75,
  ratingCount: 4,
});
```

### Review Display

- Reviews are publicly readable
- Displayed on technician profile pages
- Used to calculate and display average ratings
- Rating counts shown alongside averages

---

## Storage System

### Firebase Storage

**Purpose**: Store technician profile photos

**Configuration**: `lib/firebase/client.ts`
```typescript
import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);
```

### Photo Upload Process

**File**: `app/technician/profile/page.tsx` and `app/admin/technicians/create/page.tsx`

**Steps**:
1. **File Selection**: User selects image file
2. **Validation**:
   - File size: Max 5MB
   - File type: Must be image (`file.type.startsWith('image/')`)
3. **Filename Sanitization**:
   ```typescript
   const sanitizeFilename = (name: string): string => {
     const ext = name.split('.').pop();
     const baseName = name.substring(0, name.lastIndexOf('.'));
     const sanitized = baseName
       .replace(/[^a-zA-Z0-9]/g, '_')
       .replace(/\s+/g, '_')
       .replace(/_+/g, '_')
       .toLowerCase();
     return `${sanitized}.${ext}`;
   };
   ```
4. **Upload**:
   ```typescript
   const filename = `technicians/${timestamp}_${sanitizedName}`;
   const storageRef = ref(storage, filename);
   await uploadBytes(storageRef, file);
   const downloadURL = await getDownloadURL(storageRef);
   ```
5. **Store URL**: Download URL saved to `technician.photoUrl` in Firestore

**Storage Path Structure**:
```
technicians/
  ├── 1234567890_john_doe.jpg
  ├── 1234567891_jane_smith.png
  └── ...
```

### Photo Display

- Photos displayed in technician catalogue cards
- Used in technician profile pages
- Fallback to default avatar if no photo

---

## Admin Features

### Admin Authentication

**Custom Claims**: Admins identified by Firebase Auth custom claims (`admin: true`)

**Verification**: `lib/auth/admin.ts`
```typescript
export async function requireAdmin() {
  const token = await getIdToken(auth.currentUser);
  const decodedToken = await adminAuth.verifyIdToken(token);
  
  if (!decodedToken.admin) {
    throw new Error('Admin access required');
  }
  
  return decodedToken;
}
```

**Setting Admin Claims**: Via Firebase Admin SDK or `/api/admin/set-admin-claim` endpoint

### Admin Capabilities

#### 1. Technician Management

**Create Technician** (`/admin/technicians/create`):
- Full technician profile creation
- Photo upload
- Automatic embedding generation:
  1. Build embedding text from technician data
  2. Generate embedding via Gemini
  3. Store vector in Pinecone
  4. Save embedding metadata to Firestore

**Update Technician** (`/admin/technicians/[id]`):
- Edit all fields
- Update photo
- Regenerate embedding if profile changes

**List Technicians** (`/admin/technicians`):
- View all technicians (including invisible ones)
- Filter and search capabilities

#### 2. Booking Management

**View All Bookings** (`/admin/bookings`):
- See all bookings regardless of status
- Filter by status, date, technician, client

**Booking Details** (`/admin/bookings/[id]`):
- View full booking information
- Update status manually
- Track lead status:
  - `contacted`: Whether technician has been contacted
  - `closed`: Whether lead is closed

#### 3. Client Management

**View All Clients** (`/admin/clients`):
- List all registered clients
- View client details

**Client Details** (`/admin/clients/[id]`):
- View client profile
- View booking history
- View reviews given/received

### Admin API Routes

**File Structure**: `app/api/admin/*`

**Routes**:
- `POST /api/admin/technicians`: Create technician
- `PATCH /api/admin/technicians/[id]`: Update technician
- `PATCH /api/admin/bookings/[id]`: Update booking
- `POST /api/admin/set-admin-claim`: Set admin custom claim
- `POST /api/admin/create-session`: Create admin session

---

## AI/Embeddings System

### Purpose

Enable semantic search for technicians based on client problem descriptions (future feature). Currently, embeddings are generated and stored but not actively used in search.

### Architecture

**Components**:
1. **Google Gemini**: Generates embeddings (text-embedding-004 model)
2. **Pinecone**: Stores vector embeddings
3. **Firestore**: Stores embedding metadata

### Embedding Generation

**File**: `lib/embeddings.ts`

**Process**:
1. **Build Embedding Text**:
   ```typescript
   function buildEmbeddingText(parts: EmbeddingTextParts): string {
     return [
       `Name: ${name}`,
       `Job Types: ${jobTypes.join(', ')}`,
       `Bio: ${bio}`,
       `Tags: ${tags.join(', ')}`,
       `Serviceable Cities: ${cities.join(', ')}`,
     ].join('\n\n');
   }
   ```

2. **Generate Embedding**:
   ```typescript
   const response = await genAI.models.embedContent({
     model: 'text-embedding-004',
     contents: [text],
   });
   const embedding = response.embeddings[0].values; // 768 dimensions
   ```

3. **Store in Pinecone**:
   ```typescript
   await index.upsert([{
     id: `technician:${technicianId}`,
     values: embedding,
     metadata: {
       jobTypes,
       tags,
       cities,
       isVisible,
       technicianId,
     },
   }]);
   ```

4. **Store Metadata in Firestore**:
   ```typescript
   await technicianRef.update({
     embedding: {
       provider: 'gemini',
       model: 'text-embedding-004',
       pineconeId: `technician:${technicianId}`,
       updatedAt: new Date(),
     },
   });
   ```

### When Embeddings Are Generated

- **Technician Creation**: Automatically generated when admin creates technician
- **Technician Update**: Regenerated when admin updates technician profile
- **Error Handling**: If embedding generation fails, error is logged but technician creation continues

### Future Use Case

**Semantic Search** (not yet implemented):
```typescript
// Client describes problem: "My sink is leaking"
// 1. Generate embedding for problem description
// 2. Query Pinecone for similar technicians
// 3. Return top matches based on cosine similarity
```

---

## Security & Access Control

### Firestore Security Rules

**File**: `firestore.rules`

#### Helper Functions

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isAdmin() {
  return isAuthenticated() && request.auth.token.admin == true;
}

function isTechnician() {
  return isAuthenticated() && 
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'technician';
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```

#### Collection Rules

**Users**:
- Users can read/update their own document
- Admins can read all users

**Technicians**:
- Anyone can read visible technicians (`isVisible: true`)
- Technicians can read their own document
- Admins can create/update/delete all
- Technicians can update their own document

**Bookings**:
- Clients can read their own bookings
- Technicians can read bookings assigned to them
- Clients can create bookings for themselves
- Clients can update bookings (limited - can't change status from requested)
- Technicians can update bookings (can accept/reject)
- Admins can read/update all bookings

**Chat Messages**:
- Users can read messages for bookings they're involved in
- Users can create messages for bookings they're involved in
- Admins can read all messages

**Reviews**:
- Anyone can read reviews (public)
- Clients can create reviews for completed bookings (reviewing technician)
- Technicians can create reviews for completed bookings (reviewing client)
- Users can update their own reviews
- Admins can read/update all reviews

### API Route Security

**Admin Routes**: Protected by `requireAdmin()` middleware
**Technician Routes**: Protected by `requireTechnician()` middleware

**Example** (`app/api/admin/technicians/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(); // Verifies admin custom claim
    // ... proceed with admin operation
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Client-Side Route Protection

**Auth Gates**:
- `AuthGate`: Redirects to `/login` if not authenticated
- `TechnicianGate`: 
  - Checks if user is authenticated
  - Checks if user role is 'technician'
  - Checks if technician profile exists
  - Redirects to `/technician/login` or `/technician/profile` if needed
- `AdminGate`: Checks admin custom claim, redirects to `/admin/login` if not admin

---

## File Structure

```
technicians-as-a-service/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                 # Homepage (hero section)
│   ├── layout.tsx               # Root layout (providers, navbar)
│   ├── globals.css              # Global styles
│   │
│   ├── login/                   # Client login
│   │   └── page.tsx
│   ├── signup/                  # Client signup
│   │   └── page.tsx
│   │
│   ├── technicians/             # Technician catalogue
│   │   ├── page.tsx             # List all technicians
│   │   └── [id]/page.tsx        # Technician detail page
│   │
│   ├── booking/                  # Booking pages
│   │   ├── create/page.tsx      # Create booking
│   │   └── status/[id]/page.tsx # Booking status (client view)
│   │
│   ├── account/                  # Client account pages
│   │   ├── bookings/page.tsx    # Client's bookings list
│   │   └── reviews/page.tsx     # Leave reviews
│   │
│   ├── chat/                     # Chat interface
│   │   └── [bookingId]/page.tsx # Chat page
│   │
│   ├── technician/               # Technician-specific pages
│   │   ├── layout.tsx           # Technician layout (navbar)
│   │   ├── login/page.tsx       # Technician login
│   │   ├── dashboard/page.tsx   # Technician dashboard
│   │   ├── profile/page.tsx     # Create/update profile
│   │   └── bookings/[id]/page.tsx # Booking detail (technician view)
│   │
│   ├── admin/                   # Admin pages
│   │   ├── layout.tsx           # Admin layout (navbar)
│   │   ├── login/page.tsx       # Admin login
│   │   ├── dashboard/page.tsx   # Admin dashboard
│   │   ├── technicians/         # Technician management
│   │   │   ├── page.tsx         # List technicians
│   │   │   ├── create/page.tsx  # Create technician
│   │   │   └── [id]/page.tsx    # Edit technician
│   │   ├── bookings/            # Booking management
│   │   │   ├── page.tsx         # List bookings
│   │   │   └── [id]/page.tsx    # Booking details
│   │   └── clients/             # Client management
│   │       ├── page.tsx         # List clients
│   │       └── [id]/page.tsx   # Client details
│   │
│   └── api/                     # API routes
│       ├── admin/               # Admin API routes
│       │   ├── technicians/route.ts
│       │   ├── technicians/[id]/route.ts
│       │   ├── bookings/[id]/route.ts
│       │   └── set-admin-claim/route.ts
│       └── technician/          # Technician API routes
│           └── profile/route.ts # Create/update technician profile
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── sonner.tsx          # Toast notifications
│   │   └── ...
│   │
│   ├── auth/                    # Auth gate components
│   │   ├── auth-gate.tsx        # Client auth gate
│   │   ├── technician-gate.tsx # Technician auth gate
│   │   └── admin-gate.tsx      # Admin auth gate
│   │
│   ├── navbar.tsx               # Main navbar (clients)
│   ├── technician-navbar.tsx    # Technician navbar
│   ├── admin-navbar.tsx         # Admin navbar
│   ├── conditional-navbar.tsx  # Conditionally renders navbar
│   └── review-dialog.tsx        # Review submission dialog
│
├── lib/                         # Library code
│   ├── firebase/               # Firebase configuration
│   │   ├── client.ts           # Client-side Firebase
│   │   ├── admin.ts            # Server-side Firebase Admin
│   │   └── serviceAccountKey.json
│   │
│   ├── auth/                   # Authentication
│   │   ├── context.tsx         # AuthContext provider
│   │   ├── admin.ts            # Admin auth helpers
│   │   └── technician.ts      # Technician auth helpers
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-booking.ts      # Fetch single booking
│   │   ├── use-bookings.ts     # Fetch bookings list
│   │   ├── use-chat.ts         # Chat functionality
│   │   ├── use-technician.ts   # Fetch single technician
│   │   ├── use-technicians.ts  # Fetch technicians list
│   │   └── use-technician-bookings.ts # Technician's bookings
│   │
│   ├── providers/              # React providers
│   │   └── query-provider.tsx  # React Query provider
│   │
│   ├── types/                  # TypeScript types
│   │   └── firestore.ts        # Firestore document types
│   │
│   ├── embeddings.ts           # Gemini embedding generation
│   ├── pinecone.ts             # Pinecone client
│   └── utils.ts                # Utility functions
│
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Firestore composite indexes
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── next.config.ts              # Next.js config
└── README.md                    # Project documentation
```

---

## Key Design Decisions

### 1. Role-Based Access Control
- **Roles stored in Firestore** (not custom claims) for flexibility
- **Admin uses custom claims** for security (JWT-based)
- **Technician role** checked via Firestore document

### 2. Real-time Updates
- **Firestore listeners** (`onSnapshot`) for real-time booking status
- **Automatic review dialog** triggers when booking becomes completed
- **Chat messages** update in real-time

### 3. Mutual Reviews
- **Both parties review each other** after completion
- **Ratings aggregated** separately for clients and technicians
- **Reviews stored** with `reviewerId` and `revieweeId` for clarity

### 4. Booking Status Flow
- **Two-step completion**: Both parties must mark as completed
- **Status transitions** enforced via Firestore rules
- **Negotiation phase** between acceptance and confirmation

### 5. Photo Storage
- **Firebase Storage** for technician photos
- **Filename sanitization** for security
- **Size limits** enforced client-side and server-side

### 6. Embeddings Write-Through
- **Automatic embedding generation** on technician create/update
- **Metadata stored** in both Pinecone and Firestore
- **Error handling** allows technician creation even if embedding fails

---

## Summary

This application provides a complete platform for connecting clients with technicians, featuring:

- **Three distinct user roles** with appropriate access controls
- **Real-time communication** via Firestore listeners
- **Mutual review system** for quality assurance
- **Secure file storage** for technician photos
- **AI-ready infrastructure** with embeddings and vector search
- **Comprehensive admin tools** for platform management

The architecture is designed for scalability, security, and maintainability, with clear separation of concerns and robust error handling throughout.
