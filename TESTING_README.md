# TaskM - QA Testing Guide

## Application Overview

TaskM is a comprehensive task and project management application designed for both individual users and organizations. The platform supports hierarchical organizational structures with role-based access control, team collaboration, project management, and advanced task tracking with real-time updates.

### Tech Stack
- **Frontend**: React + TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB
- **Real-time**: Socket.io
- **Authentication**: JWT tokens
- **Email**: Nodemailer with SMTP

---

## Core Features & Modules

1. **User Authentication & Authorization**
2. **Organizational Hierarchy Management**
3. **Team Management**
4. **Project Management**
5. **Task Management & Kanban Boards**
6. **User Roles & Permissions**
7. **Invitation System**
8. **Real-time Collaboration**
9. **Document Management**
10. **Analytics & Reporting**
11. **Email Notifications**

---

## Testing Credentials

### Default Test Users
```
Super Admin:
- Email: admin@taskm.com
- Password: admin123

Organization Admin:
- Email: orgadmin@company.com
- Password: orgadmin123

Team Lead:
- Email: teamlead@company.com
- Password: teamlead123

Member:
- Email: member@company.com
- Password: member123

Viewer:
- Email: viewer@company.com
- Password: viewer123
```

### Test Organization
```
Organization Name: Test Company Ltd
Domain: testcompany.com
Industry: Technology
```

---

## Feature Testing Instructions

### 1. User Authentication & Authorization

#### 1.1 User Registration
**Description**: New users can register and verify their email addresses.

**Test Steps**:
1. Navigate to `/register`
2. Fill in the registration form:
   - Name: "John Tester"
   - Email: "john.tester@example.com"
   - Password: "password123"
   - Confirm Password: "password123"
3. Submit the form
4. Check email for verification link
5. Click verification link
6. Navigate to `/login` and login with credentials

**Expected Behavior**:
- Registration successful message displayed
- Verification email sent within 30 seconds
- Email verification redirects to login page
- User can login after verification

**Edge Cases**:
- Duplicate email registration (should fail)
- Invalid email format (should fail)
- Password less than 6 characters (should fail)
- Expired verification token (should show error)

**Preconditions**: SMTP server configured and running

---

#### 1.2 User Login
**Description**: Registered users can authenticate and access the application.

**Test Steps**:
1. Navigate to `/login`
2. Enter valid credentials
3. Click "Sign In"
4. Verify redirection to dashboard

**Expected Behavior**:
- Successful login redirects to `/dashboard`
- JWT token stored in localStorage
- User session persists across browser refresh
- Navigation shows user-specific content

**Edge Cases**:
- Invalid credentials (should show error)
- Unverified email (should prompt verification)
- Empty form submission (should show validation errors)
- SQL injection attempts (should be sanitized)

---

#### 1.3 Password Reset
**Description**: Users can reset forgotten passwords via email.

**Test Steps**:
1. Navigate to `/login`
2. Click "Forgot Password?"
3. Enter registered email address
4. Check email for reset link
5. Click reset link
6. Enter new password
7. Login with new password

**Expected Behavior**:
- Reset email sent within 30 seconds
- Reset link valid for 1 hour
- Password successfully updated
- Old password no longer works

**Edge Cases**:
- Non-existent email (should not reveal user existence)
- Expired reset token (should show error)
- Invalid new password format (should validate)

---

### 2. Organizational Hierarchy Management

#### 2.1 Organization Creation
**Description**: Individual users can create organizations to enable collaboration features.

**Test Steps**:
1. Login as individual user (no organization)
2. Navigate to `/dashboard` 
3. Click "Create Organization" button
4. Fill organization form:
   - Name: "Test Organization"
   - Description: "Testing organization"
   - Domain: "testorg.com"
   - Industry: "Technology"
   - Size: "11-50"
   - Address details (optional)
5. Submit form

**Expected Behavior**:
- Organization created successfully
- User becomes organization admin (`org_admin`)
- User redirected to organization dashboard
- Navigation updates to show organization context

**Edge Cases**:
- Duplicate organization name (should fail)
- Invalid domain format (should validate)
- User already in organization (should not see create option)

**Preconditions**: User not already part of an organization

---

#### 2.2 Organization Settings
**Description**: Organization admins can manage organization settings and metadata.

**Test Steps**:
1. Login as organization admin
2. Navigate to `/organization/settings`
3. Update organization details
4. Change billing plan settings
5. Modify organization permissions
6. Save changes

**Expected Behavior**:
- Settings updated successfully
- Changes reflected across the application
- Audit trail created for changes
- Appropriate permissions enforced

**Edge Cases**:
- Non-admin user accessing settings (should deny access)
- Invalid setting values (should validate)
- Concurrent updates (should handle gracefully)

**Preconditions**: User has `org_admin` or `super_admin` role

---

### 3. Team Management

#### 3.1 Team Creation
**Description**: Organization admins and team leads can create teams within organizations.

**Test Steps**:
1. Login as organization admin
2. Navigate to `/teams`
3. Click "Create Team"
4. Fill team form:
   - Name: "Development Team"
   - Description: "Software development team"
   - Team Lead: Select from dropdown
   - Color: Choose team color
   - Visibility: "Organization"
5. Submit form

**Expected Behavior**:
- Team created successfully
- Team lead assigned correctly
- Team visible in teams list
- Team creator becomes team member

**Edge Cases**:
- Duplicate team name in organization (should fail)
- Invalid team lead selection (should validate)
- Non-admin creating team (should check permissions)

**Preconditions**: User in organization with appropriate role

---

#### 3.2 Team Member Management
**Description**: Team leads can add, remove, and manage team member roles.

**Test Steps**:
1. Login as team lead
2. Navigate to team detail page
3. Click "Add Members"
4. Select users from organization
5. Assign roles (member, lead)
6. Remove existing members
7. Update member roles

**Expected Behavior**:
- Members added successfully
- Role assignments work correctly
- Members can access team resources
- Role changes reflected immediately

**Edge Cases**:
- Adding non-organization users (should fail)
- Removing team lead (should validate)
- Invalid role assignments (should validate)

**Test Data**:
```
Team Members to Add:
- john.doe@company.com (Member)
- jane.smith@company.com (Member)
- bob.wilson@company.com (Lead)
```

---

### 4. Project Management

#### 4.1 Project Creation
**Description**: Users can create projects with different visibility levels and team assignments.

**Test Steps**:
1. Login as organization member
2. Navigate to `/projects`
3. Click "Create Project"
4. Fill project form:
   - Name: "Mobile App Development"
   - Description: "iOS and Android mobile application"
   - Department: "Engineering"
   - Team: Select team (optional)
   - Visibility: "Team" or "Organization"
   - Members: Add project members
   - Kanban Columns: Customize workflow
   - Tags: Add relevant tags
   - Start/End dates
6. Submit form

**Expected Behavior**:
- Project created successfully
- Proper access permissions applied
- Kanban board initialized
- Project members receive notifications

**Edge Cases**:
- Invalid date ranges (end before start)
- Unauthorized team selection
- Invalid member assignments
- Duplicate project names

**Test Data**:
```
Project Details:
- Name: "E-commerce Platform"
- Description: "Online shopping platform development"
- Department: "Product Development"
- Tags: ["web", "ecommerce", "react"]
- Duration: 3 months
```

---

#### 4.2 Project Member Management
**Description**: Project admins can manage project membership and roles.

**Test Steps**:
1. Login as project creator/admin
2. Navigate to project detail page
3. Go to "Members" tab
4. Add new members with roles
5. Update existing member roles
6. Remove members from project
7. Verify access changes take effect

**Expected Behavior**:
- Member additions/removals work correctly
- Role changes affect permissions immediately
- Non-members lose project access
- Audit trail maintained

**Roles to Test**:
- Admin: Full project control
- Member: Standard project access
- Viewer: Read-only access

---

### 5. Task Management & Kanban Boards

#### 5.1 Task Creation
**Description**: Users can create tasks within projects or as personal tasks.

**Test Steps**:
1. Login as project member
2. Navigate to project kanban board
3. Click "Add Task" in any column
4. Fill task form:
   - Title: "Implement user authentication"
   - Description: "Add JWT-based authentication system"
   - Priority: "High"
   - Assigned Users: Select team members
   - Start Date: Today
   - End Date: Next week
   - Tags: ["backend", "security"]
5. Submit form

**Expected Behavior**:
- Task appears in correct kanban column
- Assigned users receive notifications
- Task details saved correctly
- Real-time updates for other users

**Edge Cases**:
- Empty title (should fail validation)
- Invalid date ranges
- Assigning non-project members
- Very long descriptions

**Test Data**:
```
Sample Tasks:
1. "Setup CI/CD Pipeline" (Priority: Medium)
2. "Database Schema Design" (Priority: High)
3. "Write Unit Tests" (Priority: Low)
4. "UI/UX Review" (Priority: Medium)
```

---

#### 5.2 Task Management Operations
**Description**: Users can update, move, and manage tasks through the kanban interface.

**Test Steps**:
1. Drag and drop tasks between columns
2. Edit task details by clicking on task
3. Update task status, priority, assignees
4. Add subtasks to main tasks
5. Add comments and attachments
6. Complete and archive tasks
7. Delete tasks (if authorized)

**Expected Behavior**:
- Drag-and-drop updates task status
- Changes reflected in real-time
- Task history maintained
- Proper permission enforcement

**Column Workflow to Test**:
- To Do → In Progress → Review → Done
- Blocked → In Progress (unblocking)
- Review → To Do (rejected changes)

---

#### 5.3 Subtask Management
**Description**: Users can break down complex tasks into manageable subtasks.

**Test Steps**:
1. Open existing task details
2. Navigate to "Subtasks" section
3. Add new subtask:
   - Title: "Setup database connection"
   - Priority: "Medium"
   - Estimated hours: 2
4. Mark subtasks as complete
5. Edit subtask details
6. Delete subtasks
7. Verify parent task progress updates

**Expected Behavior**:
- Subtasks created and linked correctly
- Parent task shows completion percentage
- Subtask changes logged in task history
- Subtask status affects parent task

---

### 6. User Roles & Permissions

#### 6.1 Role-Based Access Control
**Description**: Different user roles have appropriate access levels and capabilities.

**Test Steps**:
1. Test each role's access to different features:

**Super Admin Testing**:
- Access all organizations
- Manage any project/team
- Create/delete organizations
- Access system analytics

**Organization Admin Testing**:
- Manage organization settings
- Create/manage teams
- Access all organization projects
- Invite organization members

**Team Lead Testing**:
- Manage assigned teams
- Create team projects
- Assign tasks within team
- View team analytics

**Member Testing**:
- Access assigned projects
- Create/edit own tasks
- Participate in teams
- Limited administrative access

**Viewer Testing**:
- Read-only access to assigned projects
- Cannot create/edit content
- Cannot manage team/project settings

**Expected Behavior**:
- Each role respects defined permissions
- Unauthorized actions blocked with appropriate errors
- UI elements hidden for unauthorized features
- API endpoints enforce role-based access

---

### 7. Invitation System

#### 7.1 User Invitation Flow
**Description**: Organization admins can invite new users with specific roles and assignments.

**Test Steps**:
1. Login as organization admin
2. Navigate to `/organization/dashboard`
3. Click "Invite Members"
4. Fill invitation form:
   - Emails: "newuser1@example.com, newuser2@example.com"
   - Role: "Member"
   - Teams: Select teams to assign
   - Projects: Select projects to assign
   - Custom message: "Welcome to our team!"
5. Send invitations
6. Check invited user's email
7. Accept invitation and complete signup

**Expected Behavior**:
- Invitation emails sent successfully
- Unique invitation tokens generated
- Invited users can complete registration
- Role and team assignments applied correctly
- Invitation expires after 7 days

**Edge Cases**:
- Invalid email addresses (should validate)
- Inviting existing users (should handle gracefully)
- Expired invitation tokens (should show error)
- Malformed invitation links (should validate)

**Test Data**:
```
Invitation Batches:
1. Single user: "alice@newcompany.com" as Team Lead
2. Multiple users: ["bob@test.com", "carol@test.com"] as Members
3. User with project assignments: "dave@test.com" to specific projects
```

---

### 8. Real-time Collaboration

#### 8.1 Real-time Updates
**Description**: Changes made by one user are reflected in real-time for other connected users.

**Test Steps**:
1. Open same project in two different browsers/tabs
2. Login as different users in each tab
3. Perform actions in one tab:
   - Create new task
   - Move task between columns
   - Update task details
   - Add comments
   - Change project settings
4. Verify changes appear immediately in other tab

**Expected Behavior**:
- Changes appear within 1-2 seconds
- No page refresh required
- WebSocket connections stable
- Conflict resolution handled properly

**Real-time Features to Test**:
- Task creation/updates
- Status changes
- Member additions
- Comment additions
- Project updates

---

### 9. Document Management

#### 9.1 Document Creation and Editing
**Description**: Users can create, edit, and manage documents within projects.

**Test Steps**:
1. Navigate to project detail page
2. Go to "Documents" tab
3. Click "Create Document"
4. Enter document title: "Project Requirements"
5. Use rich text editor to add content
6. Save document
7. Edit existing document
8. Share document with team members
9. Export document in different formats

**Expected Behavior**:
- Documents created and saved correctly
- Rich text formatting preserved
- Document versions maintained
- Proper access control applied
- Export functionality works

---

### 10. Analytics & Reporting

#### 10.1 Dashboard Analytics
**Description**: Users can view analytics and reports for their projects and tasks.

**Test Steps**:
1. Login as organization admin
2. Navigate to `/analytics`
3. View organization-wide statistics
4. Check project completion rates
5. Review user activity reports
6. Analyze task distribution
7. Export reports

**Expected Behavior**:
- Accurate data calculations
- Charts and graphs display correctly
- Data updates in real-time
- Export functionality works
- Role-based data filtering applied

**Metrics to Verify**:
- Total users, projects, tasks
- Completion rates
- Active team members
- Project timelines
- Task priority distribution

---

## Test Data Setup Scripts

### Creating Test Organization and Users
```bash
# Run the organization creation test script
node test-organization-creation.js

# Create dummy data
node server/seed-dummy-data.js
```

### Sample Test Data
```javascript
// Test Users
const testUsers = [
  { name: "Alice Admin", email: "alice@testorg.com", role: "org_admin" },
  { name: "Bob Lead", email: "bob@testorg.com", role: "team_lead" },
  { name: "Charlie Member", email: "charlie@testorg.com", role: "member" },
  { name: "Diana Viewer", email: "diana@testorg.com", role: "viewer" }
];

// Test Projects
const testProjects = [
  { name: "Mobile App", department: "Engineering", visibility: "team" },
  { name: "Marketing Website", department: "Marketing", visibility: "organization" },
  { name: "Internal Tools", department: "IT", visibility: "private" }
];

// Test Tasks
const testTasks = [
  { title: "Setup project infrastructure", priority: "high" },
  { title: "Design user interface", priority: "medium" },
  { title: "Implement core features", priority: "high" },
  { title: "Write documentation", priority: "low" }
];
```

---

## API Testing

### Key API Endpoints to Test

#### Authentication
```
POST /api/auth/register - User registration
POST /api/auth/login - User login
GET /api/auth/verify - Token verification
POST /api/auth/accept-invitation/:token - Accept invitation
```

#### Organizations
```
POST /api/organizations - Create organization
GET /api/organizations/my-organization - Get user's organization
POST /api/organizations/invite - Invite members
GET /api/organizations/members - Get organization members
```

#### Teams
```
POST /api/teams - Create team
GET /api/teams - Get user's teams
POST /api/teams/:id/members - Add team member
PUT /api/teams/:id/members/:userId/role - Update member role
```

#### Projects
```
POST /api/projects - Create project
GET /api/projects - Get user's projects
PUT /api/projects/:id - Update project
POST /api/projects/:id/members - Add project member
```

#### Tasks
```
POST /api/tasks - Create task
GET /api/tasks - Get user's tasks
PUT /api/tasks/:id - Update task
POST /api/tasks/:id/subtasks - Create subtask
```

### Sample API Test Requests
```bash
# Login test
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskm.com","password":"admin123"}'

# Create task test
curl -X POST http://localhost:5001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"Test Task","description":"API test task","priority":"medium"}'
```

---

## Browser Compatibility Testing

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features to Test Across Browsers
- WebSocket connections
- File uploads
- Drag and drop functionality
- Real-time updates
- Local storage persistence
- Responsive design

---

## Performance Testing

### Load Testing Scenarios
1. **Concurrent Users**: 50+ users simultaneously
2. **Large Datasets**: 1000+ tasks, 100+ projects
3. **Real-time Updates**: Multiple users editing same project
4. **File Uploads**: Large document attachments
5. **API Response Times**: < 500ms for standard operations

### Performance Benchmarks
- Page load time: < 3 seconds
- Task creation: < 1 second
- Real-time updates: < 2 seconds
- Search operations: < 1 second
- Report generation: < 5 seconds

---

## Security Testing

### Security Test Cases
1. **Authentication Bypass**: Attempt access without valid tokens
2. **Authorization Bypass**: Access resources beyond user permissions
3. **SQL Injection**: Test input fields with malicious SQL
4. **XSS Attacks**: Test script injection in user inputs
5. **CSRF Protection**: Verify CSRF token implementation
6. **Data Validation**: Test with malformed/oversized inputs

### Security Checklist
- [ ] JWT tokens properly validated
- [ ] Sensitive routes protected
- [ ] Input sanitization implemented
- [ ] File upload restrictions enforced
- [ ] Rate limiting in place
- [ ] HTTPS enforced in production
- [ ] Password hashing implemented
- [ ] Session management secure

---

## Environment Setup for Testing

### Local Development Setup
1. Clone repository
2. Install dependencies:
   ```bash
   # Server dependencies
   cd server && npm install
   
   # Client dependencies
   cd ../client && npm install
   ```
3. Setup environment variables:
   ```bash
   # Server .env
   JWT_SECRET=your-secret-key
   MONGODB_URI=mongodb://localhost:27017/taskmanagement
   EMAIL_USER=your-email@example.com
   EMAIL_PASS=your-app-password
   ```
4. Start services:
   ```bash
   # Start MongoDB
   mongod
   
   # Start server (port 5001)
   cd server && npm run dev
   
   # Start client (port 5173)
   cd client && npm run dev
   ```

### Test Database Setup
```bash
# Create test database
mongo
use taskmanagement_test

# Run seed script
node server/seed-dummy-data.js
```

---

## Bug Reporting Guidelines

### Bug Report Template
```
**Title**: Brief description of the issue

**Environment**:
- Browser: Chrome 120.0
- OS: Windows 11
- App Version: 1.0.0
- User Role: Organization Admin

**Steps to Reproduce**:
1. Login as organization admin
2. Navigate to teams page
3. Click "Create Team"
4. Submit empty form

**Expected Behavior**:
Form validation should prevent submission

**Actual Behavior**:
Form submits with empty data, creates team with null name

**Screenshots/Videos**:
[Attach relevant media]

**Additional Information**:
- Console errors: [Include any console errors]
- Network requests: [Include failed requests]
- User impact: [High/Medium/Low]
```

### Severity Levels
- **Critical**: Application crash, data loss, security vulnerability
- **High**: Core functionality broken, major user impact
- **Medium**: Feature partially working, moderate user impact
- **Low**: Minor UI issues, edge case problems

### Bug Categories
- **Functional**: Feature not working as expected
- **UI/UX**: Visual or usability issues
- **Performance**: Slow responses, timeouts
- **Security**: Potential security vulnerabilities
- **Data**: Data integrity or corruption issues

---

## Known Issues & Limitations

### Current Known Issues
1. **Real-time updates**: Occasional delays during high traffic
2. **File uploads**: Large files (>10MB) may timeout
3. **Mobile responsiveness**: Some modals not fully optimized
4. **Email delivery**: SMTP configuration required for invitations
5. **Browser caching**: Hard refresh needed after role changes

### Feature Limitations
1. **Organization limit**: One organization per user
2. **File storage**: Local storage only (no cloud integration)
3. **Team size**: Recommended maximum 50 members per team
4. **Project tasks**: Maximum 1000 tasks per project for optimal performance
5. **Offline functionality**: Limited offline capabilities

### Workarounds
- **SMTP issues**: Use local SMTP server for testing
- **Performance**: Clear browser cache if experiencing slowdowns
- **Mobile issues**: Use desktop browser for full functionality
- **File uploads**: Compress large files before uploading

---

## Test Report Template

### Test Execution Summary
```
**Test Period**: [Start Date] - [End Date]
**Tester**: [Tester Name]
**Environment**: [Test Environment Details]

**Test Results Summary**:
- Total Test Cases: 150
- Passed: 142
- Failed: 6
- Blocked: 2
- Pass Rate: 94.7%

**Critical Issues Found**: 0
**High Priority Issues**: 2
**Medium Priority Issues**: 4
**Low Priority Issues**: 8

**Recommendations**:
- Fix high priority authentication issues before release
- Address UI responsiveness on mobile devices
- Optimize database queries for large datasets
```

### Feature-wise Test Results
```
**Authentication & Authorization**: ✅ PASS (15/15)
**Organization Management**: ✅ PASS (12/12)
**Team Management**: ⚠️ PARTIAL (18/20) - 2 minor UI issues
**Project Management**: ✅ PASS (25/25)
**Task Management**: ⚠️ PARTIAL (22/25) - 3 edge case failures
**Real-time Features**: ✅ PASS (10/10)
**Email System**: ❌ FAIL (5/8) - SMTP configuration issues
**API Endpoints**: ✅ PASS (35/35)
**Security**: ✅ PASS (8/8)
```

---

This comprehensive testing guide covers all major features and functionality of the TaskM application. Follow these test procedures systematically to ensure thorough validation of the application's capabilities. Remember to test with different user roles and in various scenarios to catch edge cases and ensure robust functionality.

For questions or clarification on any testing procedures, please refer to the application documentation or contact the development team.
