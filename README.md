# InsureMatch Backend

Backend API for the InsureMatch application - a platform for matching users with insurance options.

## Features

### End User Features
- User registration with email and password
- Email verification with 6-digit codes
- JWT-based authentication
- Password hashing with bcrypt
- Age verification (18+)

### Admin Features (NEW ✨)
- Platform Admin account creation
- Insurer Admin invitation system
- Insurer Agent invitation system
- Token-based invitation links (48-hour expiration)
- Role-based access control (RBAC)
- Secure invitation email delivery

### Technical Features
- Email service with nodemailer
- MongoDB database with mongoose
- Input validation and sanitization
- JWT-based authentication & authorization
- Middleware for authentication and role-based access

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Express-validator** - Input validation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd insurematch-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/insurematch
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email configuration (optional for development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@insurematch.com
```

4. Start MongoDB (if running locally)
```bash
mongod
```

5. Run the application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

6. (Optional) Create first Platform Admin
```bash
# Using the seed script
npm run seed:admin
```

This creates a Platform Admin with credentials from your `.env` file (or defaults to `admin@insurematch.com` / `AdminPass123`).

## API Documentation

### 📚 Comprehensive Documentation

For detailed API documentation, testing guides, and implementation details, see:

- **[ADMIN_API_DOCUMENTATION.md](./ADMIN_API_DOCUMENTATION.md)** - Complete API docs for admin features
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Step-by-step testing instructions
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[postman_collection.json](./postman_collection.json)** - Postman collection for easy API testing

### Base URL
```
http://localhost:5000/api
```

### User Roles

The system supports the following user roles:
- `enduser` - Regular users (default)
- `broker` - Insurance brokers
- `admin` - General admin (legacy)
- `platform_admin` - Platform administrators with full access
- `insurer_admin` - Administrators for insurance companies
- `insurer_agent` - Agents for insurance companies

### Authentication Endpoints

#### 1. Register New User

**Endpoint:** `POST /api/auth/register`

**Description:** Register a new end-user account. User must verify their email before being able to log in.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "dateOfBirth": "1990-01-15"
}
```

**Validation Rules:**
- `email`: Valid email format
- `password`: Minimum 8 characters, must contain uppercase, lowercase, and number
- `name`: Minimum 2 characters, letters and spaces only
- `dateOfBirth`: Valid date, user must be 18+ years old

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email for a verification code.",
  "data": {
    "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": false
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "An account with this email already exists"
}
```

#### 2. Verify Email

**Endpoint:** `POST /api/auth/verify-email`

**Description:** Verify user email with the 6-digit code sent during registration. Returns JWT token upon successful verification.

**Request Body:**
```json
{
  "email": "user@example.com",
  "verificationCode": "123456"
}
```

**Validation Rules:**
- `email`: Valid email format
- `verificationCode`: Exactly 6 numeric digits

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "email": "user@example.com",
      "name": "John Doe",
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "isEmailVerified": true,
      "role": "enduser"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired verification code"
}
```

#### 3. Resend Verification Code

**Endpoint:** `POST /api/auth/resend-verification`

**Description:** Resend verification code to user's email if previous code expired or was not received.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification code has been resent to your email"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email is already verified"
}
```

### Admin Endpoints (NEW ✨)

For complete documentation of admin endpoints, see [ADMIN_API_DOCUMENTATION.md](./ADMIN_API_DOCUMENTATION.md).

#### Overview

- **POST /api/auth/admin/create-platform-admin** - Create new Platform Admin (requires Platform Admin authentication)
- **POST /api/auth/admin/invite-insurer-admin** - Invite Insurer Admin (requires Platform Admin authentication)
- **POST /api/auth/admin/invite-insurer-agent** - Invite Insurer Agent (requires Platform Admin authentication)
- **POST /api/auth/accept-invitation** - Accept invitation and set password (public endpoint)

All admin endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

Only Platform Admins can access admin endpoints. Invitation links expire after 48 hours.

### Health Check

**Endpoint:** `GET /health`

**Description:** Check if the API is running

**Success Response (200):**
```json
{
  "success": true,
  "message": "InsureMatch API is running",
  "timestamp": "2024-03-26T10:30:00.000Z"
}
```

## Registration Flow

1. **User Registration**
   - User submits registration form with email, password, name, and date of birth
   - Backend validates all inputs
   - Password is hashed using bcrypt
   - User record is created with `isEmailVerified: false`
   - 6-digit verification code is generated and stored
   - Verification email is sent to user

2. **Email Verification**
   - User receives email with 6-digit code (valid for 15 minutes)
   - User submits email and verification code
   - Backend validates the code
   - User's `isEmailVerified` is set to `true`
   - JWT token is generated and returned
   - Welcome email is sent

3. **Using the Token**
   - Include token in Authorization header for protected routes:
   ```
   Authorization: Bearer <token>
   ```

## Email Configuration

### Development Mode
If email credentials are not configured, verification codes will be logged to the console:
```
=== EMAIL SIMULATION ===
To: user@example.com
Subject: Verify Your Email - InsureMatch
Verification Code: 123456
========================
```

### Production Mode
Configure SMTP settings in `.env`:
- For Gmail: Use App Passwords (requires 2FA)
- For other providers: Use their SMTP settings

## Database Schema

### User Model
```javascript
{
  email: String,           // Unique, validated email
  password: String,        // Hashed password
  name: String,           // User's full name
  dateOfBirth: Date,      // User's date of birth (18+ required)
  isEmailVerified: Boolean, // Email verification status
  emailVerificationCode: String,  // 6-digit code
  emailVerificationExpires: Date, // Code expiration time
  role: String,           // 'enduser', 'broker', 'admin', 'platform_admin', 'insurer_admin', 'insurer_agent'
  invitationToken: String, // Token for admin/agent invitations (NEW)
  invitationExpiresAt: Date, // Invitation expiration time (NEW)
  insurerId: ObjectId,    // Reference to Insurer (NEW)
  createdAt: Date,        // Auto-generated
  updatedAt: Date         // Auto-generated
}
```

## Error Handling

All errors follow a consistent format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Array of validation errors (if applicable)
}
```

## Testing

Run tests:
```bash
npm test
```

## Project Structure

```
insurematch-backend/
├── controllers/
│   └── authController.js          # Authentication logic (including admin operations)
├── models/
│   └── User.js                    # User model (with admin roles)
├── routes/
│   └── auth.js                    # Authentication routes (including admin routes)
├── middleware/                     # NEW
│   └── auth.js                    # Authentication & authorization middleware
├── utils/
│   └── emailService.js            # Email sending functionality (including invitations)
├── scripts/                        # NEW
│   └── seedPlatformAdmin.js       # Seed script for first Platform Admin
├── .env.example                   # Example environment variables
├── .gitignore                     # Git ignore file
├── package.json                   # Dependencies and scripts
├── server.js                      # Application entry point
├── README.md                      # This file
├── ADMIN_API_DOCUMENTATION.md     # NEW - Complete admin API documentation
├── IMPLEMENTATION_SUMMARY.md      # NEW - Technical implementation details
├── TESTING_GUIDE.md               # NEW - Step-by-step testing guide
└── postman_collection.json        # NEW - Postman collection for API testing
```

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token-based authentication & authorization
- Role-based access control (RBAC) for admin operations
- Email verification required before account activation
- Secure invitation tokens using crypto.randomBytes (256-bit)
- Time-limited invitation links (48-hour expiration)
- Input validation and sanitization
- Age verification (18+ only)
- Password complexity requirements
- Protected admin endpoints with middleware
- CORS enabled for cross-origin requests
- Environment-based configuration

## Future Enhancements

- Login endpoint
- Password reset functionality
- Refresh token implementation
- Rate limiting
- Account lockout after failed attempts
- OAuth integration (Google, Facebook)
- Two-factor authentication
- User profile management

## License

MIT