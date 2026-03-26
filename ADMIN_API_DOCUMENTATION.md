# Admin API Documentation

This document describes the API endpoints for Platform Admin account creation and Insurer Admin/Agent invitation flow.

## Table of Contents
1. [Create Platform Admin](#create-platform-admin)
2. [Invite Insurer Admin](#invite-insurer-admin)
3. [Invite Insurer Agent](#invite-insurer-agent)
4. [Accept Invitation](#accept-invitation)

---

## Create Platform Admin

Creates a new Platform Admin account. Only existing Platform Admins can create new Platform Admin accounts.

**Endpoint:** `POST /api/auth/admin/create-platform-admin`

**Authentication:** Required (Platform Admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `password`: Minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one number (required)
- `name`: Minimum 2 characters, letters and spaces only (required)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Platform Admin account created successfully",
  "data": {
    "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "admin@example.com",
    "name": "John Doe",
    "role": "platform_admin"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Validation errors or email already exists
- **401 Unauthorized** - Missing or invalid token
- **403 Forbidden** - Insufficient permissions (not a Platform Admin)
- **500 Internal Server Error** - Server error

---

## Invite Insurer Admin

Sends an invitation email to a new Insurer Admin. The invitation link expires in 48 hours.

**Endpoint:** `POST /api/auth/admin/invite-insurer-admin`

**Authentication:** Required (Platform Admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "insurer.admin@example.com",
  "name": "Jane Smith",
  "insurerId": "65f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `name`: Minimum 2 characters, letters and spaces only (required)
- `insurerId`: Valid MongoDB ObjectId (optional)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Invitation sent successfully to Insurer Admin",
  "data": {
    "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "insurer.admin@example.com",
    "name": "Jane Smith",
    "role": "insurer_admin",
    "invitationLink": "http://localhost:3000/accept-invitation?token=abc123...&email=insurer.admin%40example.com",
    "expiresAt": "2026-03-28T10:30:00.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Validation errors or email already exists
- **401 Unauthorized** - Missing or invalid token
- **403 Forbidden** - Insufficient permissions (not a Platform Admin)
- **500 Internal Server Error** - Server error

---

## Invite Insurer Agent

Sends an invitation email to a new Insurer Agent. The invitation link expires in 48 hours.

**Endpoint:** `POST /api/auth/admin/invite-insurer-agent`

**Authentication:** Required (Platform Admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "agent@example.com",
  "name": "Bob Johnson",
  "insurerId": "65f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `name`: Minimum 2 characters, letters and spaces only (required)
- `insurerId`: Valid MongoDB ObjectId (optional)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Invitation sent successfully to Insurer Agent",
  "data": {
    "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "agent@example.com",
    "name": "Bob Johnson",
    "role": "insurer_agent",
    "invitationLink": "http://localhost:3000/accept-invitation?token=xyz789...&email=agent%40example.com",
    "expiresAt": "2026-03-28T10:30:00.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Validation errors or email already exists
- **401 Unauthorized** - Missing or invalid token
- **403 Forbidden** - Insufficient permissions (not a Platform Admin)
- **500 Internal Server Error** - Server error

---

## Accept Invitation

Allows an invited user to accept their invitation and set their password. This endpoint is public and does not require authentication.

**Endpoint:** `POST /api/auth/accept-invitation`

**Authentication:** Not required

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "insurer.admin@example.com",
  "token": "abc123def456...",
  "password": "SecurePass123"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `token`: Non-empty string (required)
- `password`: Minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one number (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Invitation accepted successfully! Your account is now active.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "email": "insurer.admin@example.com",
      "name": "Jane Smith",
      "role": "insurer_admin",
      "isEmailVerified": true
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Validation errors or expired invitation link
  ```json
  {
    "success": false,
    "message": "Invalid or expired invitation link. Invitation links expire after 48 hours."
  }
  ```
- **404 Not Found** - User not found
- **500 Internal Server Error** - Server error

---

## Role Types

The system supports the following role types:

- `enduser`: Regular users of the platform
- `broker`: Insurance brokers
- `admin`: General admin (legacy)
- `platform_admin`: Platform administrators with full access
- `insurer_admin`: Administrators for specific insurance companies
- `insurer_agent`: Agents working for insurance companies

---

## Invitation Flow

1. **Platform Admin creates invitation:**
   - Platform Admin calls either `/api/auth/admin/invite-insurer-admin` or `/api/auth/admin/invite-insurer-agent`
   - System creates a user account with a temporary password and generates an invitation token
   - System sends an email with the invitation link to the invited user
   - Invitation link expires in 48 hours

2. **Invited user accepts invitation:**
   - User receives email with invitation link
   - User clicks the link (or manually enters the URL)
   - User is directed to a page where they can set their password
   - User submits the form to `/api/auth/accept-invitation` with their email, token, and chosen password
   - System validates the token and updates the user account
   - User receives a JWT token and can now log in

3. **Error handling:**
   - If the invitation link has expired (> 48 hours), the user receives a clear error message
   - The user must request a new invitation from the Platform Admin

---

## Testing Notes

### Prerequisites
- MongoDB running locally or connection string in `.env`
- Environment variables configured (see `.env.example`)

### Initial Platform Admin Setup
Since only Platform Admins can create other Platform Admins, you'll need to create the first Platform Admin directly in the database or through a seed script.

**Option 1: Using MongoDB directly**
```javascript
// Connect to your MongoDB database and run:
db.users.insertOne({
  email: "first.admin@example.com",
  password: "$2a$10$...", // Hash this using bcrypt
  name: "First Admin",
  role: "platform_admin",
  isEmailVerified: true,
  dateOfBirth: new Date("1990-01-01"),
  createdAt: new Date(),
  updatedAt: new Date()
});
```

**Option 2: Temporarily modify the register endpoint to allow platform_admin role**

### Email Configuration

For development, emails are logged to the console if SMTP is not configured. Check the console output for invitation links during testing.

For production, configure the following environment variables:
```
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@insurematch.com
EMAIL_PASS=your-email-password
EMAIL_FROM=noreply@insurematch.com
FRONTEND_URL=https://your-frontend-url.com
```

---

## Security Considerations

1. **Authentication**: Admin endpoints are protected by JWT authentication and role-based authorization
2. **Token Expiration**: Invitation tokens expire after 48 hours to limit exposure
3. **Password Requirements**: Strong password validation enforces security best practices
4. **Email Verification**: Invited users must verify their email through the invitation process
5. **Rate Limiting**: Consider implementing rate limiting on invitation endpoints to prevent abuse

---

## Future Enhancements

Potential improvements for the invitation system:

1. **Resend Invitation**: Allow Platform Admins to resend expired invitations
2. **Revoke Invitation**: Allow Platform Admins to revoke pending invitations
3. **Invitation History**: Track all invitations sent and their status
4. **Bulk Invitations**: Allow inviting multiple users at once
5. **Custom Expiration**: Allow configurable invitation expiration times
6. **Invitation Templates**: Customizable email templates per organization
