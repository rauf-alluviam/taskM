# Task Management Application

A full-stack task management application built with React, Node.js, Express, and MongoDB.

## Project Structure

```
taskM/
├── client/                 # React frontend
│   ├── src/
│   ├── .env               # Client environment variables
│   ├── .env.example       # Client environment template
│   ├── tailwind.config.js # Tailwind CSS configuration
│   ├── postcss.config.js  # PostCSS configuration
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   ├── .env               # Server environment variables
│   ├── .env.example       # Server environment template
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd taskM
   ```

2. **Install dependencies for each service**
   ```bash
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   cd ..
   ```

   **Or use the convenience script:**
   ```bash
   npm run install:all
   ```

3. **Environment Configuration**
   
   **Client (.env)**
   - Environment file already created at `client/.env`
   - Modify if needed for your setup
   
   **Server (.env)**
   - Environment file already created at `server/.env`
   - Update MongoDB URI, JWT secrets, and AWS credentials as needed

4. **Database Setup**
   - Ensure MongoDB is running on your system
   - The default connection is: `mongodb://localhost:27017/taskmanagement`
   - Update the `MONGODB_URI` in `server/.env` if using a different setup

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
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## Available Scripts

### Client Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Server Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

## Environment Variables

### Client Environment Variables
- `VITE_API_URL` - Backend API URL
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Application version

### Server Environment Variables
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - CORS allowed origin

## Features

- Task management with CRUD operations
- User authentication and authorization
- Project organization
- Document management
- Drag-and-drop task sorting
- Responsive design with Tailwind CSS

## Technologies Used

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router
- Axios
- DND Kit (for drag-and-drop)
- Lucide React (icons)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Bcrypt for password hashing
- Multer for file uploads
- Helmet for security
- CORS
- Rate limiting

## Development

### Code Style
- ESLint configured for both client and server
- TypeScript for type safety
- Tailwind CSS for styling

### API Endpoints
- `/api/auth` - Authentication routes
- `/api/tasks` - Task management
- `/api/projects` - Project management
- `/api/documents` - Document management
- `/api/files` - File upload/download

## Deployment

### Client
```bash
cd client
npm run build
# Deploy the dist/ folder to your hosting service
```

### Server
```bash
cd server
# Set NODE_ENV=production in your .env
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
