# Dental Implant Application - Codebase Architecture Analysis

## Overview

This is a **Tauri v2 desktop application** for dental implant case management with offline-first capabilities. The application uses a Rust backend with SQLite database and a React frontend with TypeScript.

**Technology Stack:**
- **Desktop Framework**: Tauri v2
- **Backend**: Rust with SQLite (rusqlite)
- **Frontend**: React 19, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI components
- **3D Visualization**: React Three Fiber, Drei
- **PDF Generation**: jsPDF
- **Authentication**: Argon2 password hashing

## Architecture Pattern

The application follows a **layered architecture** with clear separation between frontend and backend:

```
Frontend (React) → Tauri IPC → Commands (Rust) → SQLite Database
                      ↓
                 File System
```

### Data Flow
1. **Frontend** calls TypeScript wrapper functions in `src/api/commands.ts`
2. **Tauri IPC** bridges JavaScript to Rust using `invoke()`
3. **Rust Commands** in `src-tauri/src/commands/` handle business logic
4. **SQLite Database** stores all persistent data
5. **File System** manages documents, images, and backups

---

## Desktop Logic Analysis (Rust Backend)

### 1. Application Lifecycle (`src-tauri/src/lib.rs`)

The entry point sets up the Tauri application with:

**State Management:**
- `DbConn`: Wrapped SQLite connection with Mutex for thread safety
- `AuthState`: Authentication state tracking with Mutex

**Initialization Flow:**
1. Creates app data directory structure
2. Establishes SQLite connection with migrations
3. Registers managed state (DbConn, AuthState)
4. Registers 65+ Tauri command handlers
5. Starts the application event loop

### 2. Database Layer (`src-tauri/src/db.rs`)

**Directory Structure:**
```
app_data_dir/
├── database/
│   └── app.sqlite
├── files/
│   └── patients/
│       └── {patient_id}/
│           └── {category}/
├── backups/
└── exports/
```

**Key Functions:**
- `app_data_root()`: Creates and returns platform-specific app data directory
- `connect_and_migrate()`: Opens SQLite connection and runs migrations
- `run_pending_migrations()`: Handles incremental schema updates
- `seed_letter_templates()`: Initializes default letter templates
- `seed_default_clinic_fee_items()`: Adds default fee items for new clinics

**Migration System:**
- Version-controlled migrations (001-004)
- Automatic backfill for existing data
- Schema validation with foreign keys

### 3. Authentication System (`src-tauri/src/commands/auth.rs`)

**Security Features:**
- Argon2 password hashing (memory-hard, GPU-resistant)
- Single-user system (user id = 1)
- Session-based authentication via Mutex state
- Password change with current password verification

**Authentication Flow:**
1. `auth_status`: Checks if account exists and current auth state
2. `auth_setup`: Initial account creation with password validation
3. `auth_login`: Password verification with Argon2
4. `auth_logout`: Clears authentication state
5. `auth_change_password`: Updates password with verification

**Authorization:**
- `require_authenticated()`: Guards all clinical data operations
- Checks both account existence and authentication state
- Called by every command that accesses patient/clinical data

### 4. Command Modules (Business Logic)

The backend is organized into 13 command modules:

#### Core Modules:
- **auth**: Authentication and authorization
- **clinics**: Clinic management, doctor profile, fee items
- **patients**: Patient CRUD, search, CSV export
- **clinical**: Medical/dental history, assessments, treatment plans
- **dashboard**: Statistics and analytics

#### Specialized Modules:
- **letters**: Letter templates, generation, PDF attachment
- **logbook**: Surgical logbook entries, CSV export
- **followups**: Patient follow-ups and complications tracking
- **file_store**: Document management, file import/export
- **backup**: Backup creation and restoration (ZIP-based)
- **reports**: Clinical reports (pending CBCT, failed cases)
- **paths**: Application path queries
- **fee_items**: Clinic-specific fee scheduling

### 5. Data Models (`src-tauri/src/models.rs`)

**Comprehensive Domain Models:**
- **Auth**: PasswordPayload, AuthStatus, AppPaths
- **Clinics**: Clinic, ClinicInput, ClinicFeeItem, DoctorProfile
- **Patients**: Patient, PatientInput, PatientFilters
- **Clinical**: MedicalHistory, DentalHistory, Assessment, TreatmentPlan, ImplantSite
- **Letters**: LetterTemplate, Letter, LetterInput
- **Logbook**: LogbookEntry, LogbookFilters
- **Files**: PatientFile, FileImportPayload, SavePdfFilePayload
- **Dashboard**: DashboardStats, recent patients/letters

**Serialization:**
- All models use serde with camelCase for JSON compatibility
- Input structs for data mutation
- Output structs for API responses

### 6. File Management (`src-tauri/src/commands/file_store.rs`)

**File Operations:**
- `file_import_dialog`: Native file picker for document import
- `file_save_blob`: Saves base64-encoded files (PDFs from frontend)
- `files_list_patient`: Lists patient files with metadata
- `file_open_path`: Opens files in system default viewer
- `file_set_include_in_letter`: Toggles letter inclusion flag

**File Organization:**
- Organized by patient ID and category
- Safe filename sanitization (alphanumeric + hyphens/underscores)
- MIME type detection for common formats
- UUID-based naming to prevent conflicts

### 7. Backup System (`src-tauri/src/commands/backup.rs`)

**Backup Creation:**
- ZIP compression with file dialogs
- Includes SQLite database and all patient files
- Preserves directory structure
- User-selectable destination

**Backup Restoration:**
- ZIP extraction to temp directory
- Database replacement with connection hot-swap
- File directory restoration
- Cleanup of temporary files

**Safety Features:**
- Validates backup structure before restoration
- Uses in-memory database during swap
- Atomic operations to prevent corruption

### 8. Dashboard Analytics (`src-tauri/src/commands/dashboard.rs`)

**Metrics Tracked:**
- Total patients, active cases, completed cases
- Pending CBCT scans, failed cases
- Surgery scheduled/completed counts
- Restoration phase cases, on-hold cases
- Follow-ups due, total implants, complications
- Per-clinic breakdowns for multi-clinic practices

**Query Patterns:**
- Conditional SQL based on clinic scope (-1 for all clinics)
- Recent activity tracking (patients, letters)
- JOIN queries for clinic name resolution
- Date-based filtering for follow-ups

---

## Frontend Analysis

### 1. API Layer (`src/api/commands.ts`)

**TypeScript Wrappers:**
- Strongly typed functions for all Rust commands
- Uses Tauri's `invoke()` for IPC calls
- Type safety with domain models from `@/types/domain`
- Consistent error handling through Tauri's error propagation

**Command Categories:**
- Authentication (status, setup, login, logout, password change)
- Clinics (CRUD, fee items, doctor profile)
- Patients (search, CRUD, export)
- Clinical (medical/dental history, assessments, treatment plans)
- Letters (templates, CRUD, PDF attachment)
- Logbook (CRUD, export)
- Files (list, import, save, open)
- Dashboard (stats)
- Backup (create, restore)

### 2. Application Structure (`src/App.tsx`)

**Routing:**
- React Router for client-side navigation
- Protected routes with `RequireAuth` component
- Auth flow: setup → login → main application

**Main Routes:**
- `/setup`: Initial account creation
- `/login`: Authentication
- `/`: Dashboard
- `/clinics`: Clinic management
- `/patients`: Patient list and forms
- `/logbook`: Surgical logbook
- `/reports`: Clinical reports
- `/backup`: Backup/restore
- `/settings`: Application settings

**Authentication Flow:**
- `AuthProvider` context manages auth state
- Auto-redirect based on auth status
- Loading states during auth checks

### 3. State Management

**Context-based State:**
- `AuthContext`: Authentication state and auto-logout
- No global state management library (Redux/Zustand) needed
- Component-level state with React hooks

**Auto-Logout:**
- `useIdleAutoLogout` hook detects inactivity
- Configurable timeout from doctor profile
- Automatic redirect to login

### 4. UI Components

**Component Structure:**
- `layout/AppLayout`: Main application shell
- `clinic/`: Clinic management components
- `dental/`: 3D dental visualization (FDI mouth chart, 3D arch)
- `ui/primitives.tsx`: Reusable UI components

**3D Visualization:**
- React Three Fiber for WebGL rendering
- FDI (Fédération Dentaire Internationale) notation
- Interactive dental arch with tooth selection
- Blender-generated 3D models (`.glb` files)

---

## Database Schema Analysis

### Core Tables:

**clinics**: Practice locations and branding
- Contact information, letter templates, signature blocks
- Active/inactive status for multi-clinic support

**users**: Single-user authentication
- Argon2 password hash
- Constraints ensure only one user (id=1)

**doctor_profile**: Practitioner settings
- Personal details, default clinic, backup locations
- UI preferences (theme, auto-lock timeout)

**patients**: Core patient records
- Demographics, contact information, referral tracking
- Case status workflow (New → Assessment → Treatment → Surgery → Restoration → Maintenance → Closed)
- Treatment tracking flags (CBCT, consent, treatment plan)

**medical_histories**: Patient medical background
- Systemic conditions (diabetes, heart disease, etc.)
- Medications, allergies, risk flags
- ASA classification for surgical risk

**dental_histories**: Oral health background
- Chief complaint, missing teeth, previous implants
- Periodontal history, oral hygiene, aesthetic concerns

**assessments**: Clinical evaluations
- JSON-based assessment data storage
- Treatment planning and implant site analysis

**treatment_plans**: Proposed treatments
- Implant systems, prosthetic options
- Cost estimates and timeline

**implant_sites**: Detailed implant positioning
- FDI notation, tooth positions, dimensions
- Bone quality assessments

**treatment_stages**: Workflow progress tracking
- Stage definitions and completion status
- Timeline management

**letters**: Correspondence system
- Template-based letter generation
- PDF attachment support
- Merge fields for patient data

**logbook_entries**: Surgical records
- Procedure details, implant counts
- Surgical notes and outcomes

**follow_ups**: Post-operative tracking
- Review dates, outcomes, complications
- Recall scheduling

**complications**: Adverse event tracking
- Complication types, severity, interventions
- Resolution tracking

**files**: Document management
- Patient file attachments
- Category-based organization
- Letter inclusion flags

**clinic_fee_items**: Practice-specific pricing
- Service items, categories, costs
- Active/inactive status

### Relationships:
- All patient-related tables foreign-key to `patients.id`
- Clinical data uses CASCADE delete for data integrity
- Clinic-based scoping for multi-clinic practices

---

## Key Design Patterns

### 1. Repository Pattern
- Command modules act as repositories for data access
- SQL encapsulation within command handlers
- Type-safe data transfer objects

### 2. Command Pattern
- All backend operations are Tauri commands
- Consistent error handling with `Result<T, String>`
- Authentication guards on sensitive operations

### 3. Migration Pattern
- Incremental schema evolution
- Version tracking in `schema_migrations` table
- Data backfill for compatibility

### 4. Builder Pattern
- Tauri application setup with chained configuration
- Complex SQL query building with conditional logic

### 5. State Pattern
- Authentication state management
- Application state through Tauri state management

---

## Security Considerations

### Strengths:
- Argon2 password hashing (modern, memory-hard)
- Authentication required for all clinical operations
- Input validation on password changes (min 8 chars)
- SQL injection prevention through parameterized queries
- File path sanitization for file operations

### Areas for Enhancement:
- No multi-user support (single-user system)
- No audit logging for sensitive operations
- Password complexity requirements could be stronger
- No rate limiting on authentication attempts
- No encryption at rest for database/files

---

## Performance Optimizations

### Database:
- Indexed columns (clinic_id, patient names, archived status)
- Connection pooling via Mutex
- Prepared statements for repeated queries
- Query limits on large result sets (500 rows)

### File Operations:
- Streaming file operations for large files
- ZIP compression for backups
- UUID-based naming prevents filesystem overhead

### Frontend:
- Code splitting with React Router
- Lazy loading of 3D models
- Efficient state management with contexts

---

## Offline Capabilities

The application is designed for **offline-first operation**:
- Local SQLite database (no cloud dependencies)
- Local file storage for documents
- No external API calls
- Desktop-native file dialogs for import/export
- Backup/restore for data portability

---

## Desktop-Specific Features

### Tauri Advantages:
- Native file system access
- System-level dialogs (file pickers)
- Native window management
- Cross-platform desktop APIs
- Smaller bundle size than Electron alternatives

### Platform Integration:
- App data directory following OS conventions
- Native file associations
- System notification potential
- OS-specific window controls

---

## Conclusion

This is a **well-architected desktop application** with clear separation of concerns and robust offline functionality. The Rust backend provides type-safe business logic with SQLite for reliable data persistence, while the React frontend offers a modern user interface with 3D visualization capabilities.

**Key Strengths:**
- Clean architecture with clear boundaries
- Comprehensive domain model for dental workflows
- Robust backup/restore system
- Offline-first design
- Type-safe communication between frontend and backend
- Extensible command system

**Architecture Maturity:**
- Professional-grade error handling
- Migration system for database evolution
- Security best practices (password hashing, authentication guards)
- Performance considerations (indexing, query limits)
- Cross-platform compatibility through Tauri

The application successfully leverages Tauri's strengths to create a capable desktop application that bridges web technologies with native desktop functionality.