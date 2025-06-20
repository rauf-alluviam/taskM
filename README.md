# TaskM - Task Management Application

A comprehensive full-stack task management application built with React, Node.js, Express, and MongoDB. Features include real-time collaboration, document management, file attachments, Kanban boards, and analytics.

## 🚀 Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- React Hook Form for form handling
- Socket.io for real-time features
- Lucide React for icons
- DND Kit for drag & drop
- React Quill for rich text editing
- Mammoth.js for Word document processing
- XLSX for Excel file handling

**Backend:**
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- Socket.io for real-time communication
- Multer for file uploads
- AWS S3 for file storage
- Express validation & rate limiting
- Helmet for security

## 📁 Project Structure

```
taskM/
├── client/          # React frontend
├── server/          # Node.js backend
├── uploads/         # Local file storage (fallback)
└── package.json     # Root package scripts
```

## 🛠 Installation & Setup

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Environment Setup:**
   Create `.env` files in both client and server directories:
   
   **Server (.env):**
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/taskflow
   JWT_SECRET=your_jwt_secret
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_S3_BUCKET_NAME=your_bucket_name
   AWS_REGION=us-east-1
   CLIENT_URL=http://localhost:3000
   ```

3. **Start Development:**
   ```bash
   npm run dev          # Both client & server
   npm run dev:client   # Frontend only
   npm run dev:server   # Backend only
   ```## 🔧 API Routes

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user
- `POST /logout` - User logout

### Users (`/api/users`)
- `GET /me` - Get current user profile
- `PUT /me` - Update profile
- `POST /me/avatar` - Upload avatar
- `GET /` - List users (admin)
- `GET /:id` - Get user by ID
- `POST /` - Create user (admin)
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user (admin)

### Tasks (`/api/tasks`)
- `GET /` - Get tasks with filters & pagination
- `GET /:id` - Get task details
- `POST /` - Create new task
- `PUT /:id` - Update task
- `DELETE /:id` - Delete task
- `POST /:id/subtasks` - Add subtask
- `GET /:id/subtasks` - Get task subtasks
- `PUT /:id/subtasks/:subtaskId` - Update subtask
- `DELETE /:id/subtasks/:subtaskId` - Delete subtask
- `GET /:id/history` - Get task change history

### Projects (`/api/projects`)
- `GET /` - List projects
- `GET /:id` - Get project details
- `POST /` - Create project
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `POST /:id/members` - Add project member
- `DELETE /:id/members/:userId` - Remove member

### Documents (`/api/documents`)
- `GET /` - List documents with pagination
- `GET /:id` - Get document details
- `POST /` - Create document
- `PUT /:id` - Update document
- `DELETE /:id` - Delete document
- `POST /upload` - Upload & convert document
- `GET /:id/download` - Download original file
- `POST /:id/export` - Export as different format

### Attachments (`/api/attachments`)
- `POST /upload` - Upload file attachment
- `GET /:id` - Get attachment details
- `GET /:id/download` - Download attachment
- `DELETE /:id` - Delete attachment
- `GET /entity/:entityType/:entityId` - Get entity attachments

### Kanban (`/api/kanban`)
- `GET /columns` - Get kanban columns
- `PUT /columns` - Update column configuration
- `POST /move` - Move task between columns
- `POST /reorder` - Reorder tasks in column

### Analytics (`/api/analytics`)
- `GET /dashboard` - Dashboard statistics
- `GET /tasks` - Task analytics
- `GET /projects` - Project analytics
- `GET /users` - User performance

### Subtasks (`/api/subtasks`)
- `GET /task/:taskId` - Get subtasks for task
- `GET /:id` - Get subtask details
- `POST /` - Create subtask
- `PUT /:id` - Update subtask
- `DELETE /:id` - Delete subtask

### Settings (`/api/settings`)
- `GET /` - Get system settings
- `PUT /` - Update settings

## 📄 Key Features

### 1. Task Management
- Create, edit, delete tasks
- Subtask management
- Task history tracking
- Priority levels & status tracking
- Due date management
- Task assignment to users

### 2. Kanban Board
- Drag & drop interface
- Customizable columns
- Visual task organization
- Real-time updates via Socket.io

### 3. Document Management
- Upload various file formats (PDF, Word, Excel, images)
- Rich text editor with Quill
- Document preview & editing
- Version control
- Text extraction from uploaded files

### 4. File Attachments
- AWS S3 integration for scalable storage
- Support for 50MB+ files
- Multiple file type support
- Secure signed URL downloads
- Local fallback storage

### 5. Project Organization
- Multi-project support
- Team member management
- Project-specific settings
- Access control

### 6. Real-time Collaboration
- Socket.io integration
- Live task updates
- Real-time notifications
- Multi-user editing

### 7. User Management
- Role-based access (Admin, Manager, Member)
- User profiles with avatars
- Team collaboration features

### 8. Analytics & Reporting
- Dashboard with key metrics
- Task completion analytics
- Project progress tracking
- User performance insights

## 🔐 Security Features

- JWT authentication
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers
- File type validation
- Access control per resource

## 🗄 Database Models

- **User**: Authentication & profile data
- **Task**: Task details, status, assignments
- **Project**: Project organization & settings
- **Document**: Document metadata & content
- **Attachment**: File attachment references
- **Subtask**: Task breakdown items
- **TaskHistory**: Change tracking

## 🌐 File Upload System

### AWS S3 Integration
- Configured for scalable file storage
- Secure signed URLs for downloads
- Automatic cleanup capabilities
- Support for large files (50MB+)

### Supported File Types
- **Documents**: PDF, DOC, DOCX, TXT, MD, RTF
- **Spreadsheets**: XLS, XLSX, CSV
- **Images**: JPG, PNG, GIF, BMP, WebP, SVG
- **Presentations**: PPT, PPTX
- **Archives**: ZIP, RAR
- **Audio/Video**: MP3, WAV, MP4, MOV

### Upload Process
1. Frontend selects files via drag-drop or file picker
2. Files uploaded to server with validation
3. Files stored in AWS S3 (or local uploads/ folder)
4. Metadata saved to MongoDB
5. Download URLs generated on-demand

## 🔄 Real-time Features

Socket.io implementation enables:
- Live task updates across clients
- Real-time kanban board changes
- Instant notifications
- Collaborative editing indicators

## 📊 Development Scripts

```bash
# Install all dependencies
npm run install:all

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Preview client build
npm run start:client

# Linting
npm run lint

# Clean all node_modules
npm run clean
```

### Running the Application

#### Option 1: Using Startup Scripts

**Windows:**
```bash
# Using batch file
start.bat

# Using PowerShell (recommended)
.\start.ps1
```

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

#### Option 2: Manual Start

1. **Start the server** (from server directory)
   ```bash
   cd server
   npm run dev
   ```

2. **Start the client** (from client directory, in a new terminal)
   ```bash
   cd client
   npm run dev
   ```

#### Option 3: Using Root Package Scripts

```bash
# Start both client and server
npm run dev

# Start only client
npm run dev:client

# Start only server
npm run dev:server
```

3. **Access the application**
   - Frontend: http://localhost:3000 (or 5173 with Vite)
   - Backend API: http://localhost:5000

## 🚀 Deployment

1. Build the client: `npm run build`
2. Set production environment variables
3. Configure MongoDB connection
4. Set up AWS S3 bucket (see AWS_S3_SETUP.md)
5. Deploy server to hosting platform
6. Serve client build files

## 📝 Environment Configuration

### Client Environment Variables
- `VITE_API_URL` - Backend API URL
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Application version

### Server Environment Variables
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `AWS_REGION` - AWS region
- `CLIENT_URL` - Frontend URL for CORS

---

**Note**: This application includes comprehensive task management, document handling, and real-time collaboration features. File uploads work with both AWS S3 and local storage as fallback. All routes are secured with authentication and proper access controls.

## License

This project is licensed under the MIT License.
