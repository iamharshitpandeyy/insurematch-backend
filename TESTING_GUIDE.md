# Testing Guide: Platform Admin & Invitation Flow

This guide provides step-by-step instructions for testing the Platform Admin account creation and Insurer Admin/Agent invitation flow.

## Prerequisites

1. **MongoDB Running:**
   ```bash
   # Start MongoDB (if not already running)
   mongod
   ```

2. **Environment Variables:**
   ```bash
   # Copy .env.example to .env
   cp .env.example .env

   # Edit .env and configure your settings
   # For development, you can leave EMAIL_HOST empty (emails will log to console)
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Start Server:**
   ```bash
   npm run dev
   ```

## Part 1: Initial Setup - Create First Platform Admin

### Option A: Using the Seed Script (Recommended)

```bash
npm run seed:admin
```

This will create a Platform Admin with credentials:
- Email: `admin@insurematch.com` (or from ADMIN_EMAIL env var)
- Password: `AdminPass123` (or from ADMIN_PASSWORD env var)

### Option B: Manual Database Insert

```javascript
// Connect to MongoDB shell
mongosh insurematch

// Insert Platform Admin
db.users.insertOne({
  email: "admin@insurematch.com",
  password: "$2a$10$xyz...", // Use bcrypt to hash "AdminPass123"
  name: "Platform Admin",
  role: "platform_admin",
  isEmailVerified: true,
  dateOfBirth: new Date("1990-01-01"),
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Part 2: Login as Platform Admin

Since we don't have a login endpoint yet, you'll need to get a JWT token manually. For testing, you can use the token returned from the `accept-invitation` endpoint, or implement a simple login endpoint.

**Quick Login Implementation (for testing only):**

Add this temporary endpoint to `routes/auth.js`:

```javascript
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

**Login Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@insurematch.com",
    "password": "AdminPass123"
  }'
```

**Save the token from the response:**
```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Part 3: Test Admin Operations

### Test 1: Create Another Platform Admin

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/admin/create-platform-admin \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@insurematch.com",
    "password": "SecurePass123",
    "name": "Second Platform Admin"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Platform Admin account created successfully",
  "data": {
    "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "admin2@insurematch.com",
    "name": "Second Platform Admin",
    "role": "platform_admin"
  }
}
```

**Test Cases:**
- ✅ Valid data → should create admin
- ❌ Duplicate email → should return 400 error
- ❌ Weak password → should return validation error
- ❌ Missing JWT token → should return 401 error
- ❌ Non-admin user token → should return 403 error

### Test 2: Invite Insurer Admin

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/admin/invite-insurer-admin \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "insureradmin@example.com",
    "name": "Jane Smith"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Invitation sent successfully to Insurer Admin",
  "data": {
    "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "insureradmin@example.com",
    "name": "Jane Smith",
    "role": "insurer_admin",
    "invitationLink": "http://localhost:3000/accept-invitation?token=abc123...&email=insureradmin%40example.com",
    "expiresAt": "2026-03-28T10:30:00.000Z"
  }
}
```

**Check Console Output:**
If email is not configured, you should see:
```
=== EMAIL SIMULATION ===
To: insureradmin@example.com
Subject: You're Invited to Join InsureMatch as Insurer Admin
Role: Insurer Admin
Invitation Link: http://localhost:3000/accept-invitation?token=...&email=...
========================
```

**Copy the invitation token from the response or console output!**

### Test 3: Invite Insurer Agent

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/admin/invite-insurer-agent \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "name": "Bob Johnson"
  }'
```

**Expected Response (201):**
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

## Part 4: Test Invitation Acceptance

### Test 4: Accept Invitation (Valid Token)

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/accept-invitation \
  -H "Content-Type: application/json" \
  -d '{
    "email": "insureradmin@example.com",
    "token": "TOKEN_FROM_PREVIOUS_STEP",
    "password": "NewSecurePass123"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Invitation accepted successfully! Your account is now active.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "email": "insureradmin@example.com",
      "name": "Jane Smith",
      "role": "insurer_admin",
      "isEmailVerified": true
    }
  }
}
```

### Test 5: Accept Invitation (Expired Token)

**To test expiration manually:**

1. Open MongoDB shell:
```bash
mongosh insurematch
```

2. Set invitation expiration to the past:
```javascript
db.users.updateOne(
  { email: "agent@example.com" },
  { $set: { invitationExpiresAt: new Date("2020-01-01") } }
)
```

3. Try to accept invitation:
```bash
curl -X POST http://localhost:5000/api/auth/accept-invitation \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "token": "VALID_TOKEN_BUT_EXPIRED",
    "password": "NewSecurePass123"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired invitation link. Invitation links expire after 48 hours."
}
```

### Test 6: Accept Invitation (Invalid Token)

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/accept-invitation \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "token": "WRONG_TOKEN",
    "password": "NewSecurePass123"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired invitation link. Invitation links expire after 48 hours."
}
```

## Part 5: Authorization Tests

### Test 7: Non-Admin User Tries to Create Admin

**Create a regular end user first:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "UserPass123",
    "name": "Regular User",
    "dateOfBirth": "1995-05-15"
  }'
```

**Verify email and get token (use code from console), then try admin operation:**
```bash
curl -X POST http://localhost:5000/api/auth/admin/create-platform-admin \
  -H "Authorization: Bearer $REGULAR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hacker@example.com",
    "password": "HackerPass123",
    "name": "Hacker Admin"
  }'
```

**Expected Response (403):**
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

### Test 8: No Authorization Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/admin/create-platform-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin3@insurematch.com",
    "password": "SecurePass123",
    "name": "Third Admin"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

## Part 6: Using Postman

1. **Import Collection:**
   - Open Postman
   - Click "Import"
   - Select `postman_collection.json`
   - Collection will be imported with all endpoints

2. **Set Variables:**
   - Click on "InsureMatch Admin API" collection
   - Go to "Variables" tab
   - Set `base_url` to `http://localhost:5000`
   - After login, set `jwt_token` to your JWT token

3. **Run Requests:**
   - Start with "Health Check"
   - Login to get JWT token
   - Set the token in collection variables
   - Test all admin operations

## Part 7: Database Verification

**Check created users in MongoDB:**
```bash
mongosh insurematch

# View all users with their roles
db.users.find({}, { email: 1, name: 1, role: 1, isEmailVerified: 1, invitationExpiresAt: 1 })

# View only admin/agent users
db.users.find(
  { role: { $in: ['platform_admin', 'insurer_admin', 'insurer_agent'] } },
  { email: 1, name: 1, role: 1, isEmailVerified: 1 }
)

# Check invitation details
db.users.find(
  { invitationToken: { $ne: null } },
  { email: 1, invitationToken: 1, invitationExpiresAt: 1 }
)
```

## Part 8: Edge Cases & Error Scenarios

### Test Case Matrix

| Test | Endpoint | Scenario | Expected Status | Expected Result |
|------|----------|----------|-----------------|-----------------|
| 1 | create-platform-admin | Valid data + valid token | 201 | Admin created |
| 2 | create-platform-admin | Duplicate email | 400 | Error: Email exists |
| 3 | create-platform-admin | Weak password | 400 | Validation error |
| 4 | create-platform-admin | No token | 401 | Authentication error |
| 5 | create-platform-admin | Non-admin token | 403 | Authorization error |
| 6 | invite-insurer-admin | Valid data | 201 | Invitation sent |
| 7 | invite-insurer-admin | Duplicate email | 400 | Error: Email exists |
| 8 | invite-insurer-agent | Valid data | 201 | Invitation sent |
| 9 | accept-invitation | Valid token + password | 200 | Account activated |
| 10 | accept-invitation | Expired token | 400 | Error: Link expired |
| 11 | accept-invitation | Invalid token | 400 | Error: Invalid link |
| 12 | accept-invitation | Weak password | 400 | Validation error |
| 13 | accept-invitation | Wrong email | 404 | User not found |

## Part 9: Clean Up

**Remove test data:**
```bash
mongosh insurematch

# Remove all test users (keep only the original admin)
db.users.deleteMany({
  email: { $ne: "admin@insurematch.com" }
})

# Or remove specific test users
db.users.deleteMany({
  email: { $in: [
    "admin2@insurematch.com",
    "insureradmin@example.com",
    "agent@example.com"
  ]}
})
```

## Troubleshooting

### Issue: "Access denied. No token provided."
**Solution:** Make sure to include the Authorization header with your JWT token:
```bash
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Issue: "Invalid token"
**Solution:**
- Check if token is expired (default: 7 days)
- Ensure you're copying the full token
- Login again to get a fresh token

### Issue: "Email already exists"
**Solution:**
- User with that email already exists in database
- Use a different email or remove the existing user

### Issue: Emails not sending
**Solution:**
- This is expected if EMAIL_HOST is not configured
- Check console logs for simulated emails
- Configure SMTP settings in .env for production

### Issue: "MongoDB connection error"
**Solution:**
- Make sure MongoDB is running: `mongod`
- Check MONGODB_URI in .env
- Verify database name: `insurematch`

### Issue: "Cannot find module"
**Solution:**
- Run `npm install` to install all dependencies
- Check that all files exist in correct directories

## Success Criteria Checklist

- [ ] First Platform Admin created successfully
- [ ] Platform Admin can login and get JWT token
- [ ] Platform Admin can create additional Platform Admins
- [ ] Platform Admin can invite Insurer Admins
- [ ] Platform Admin can invite Insurer Agents
- [ ] Invitation emails are sent (or logged to console)
- [ ] Invitations expire after 48 hours
- [ ] Clear error message shown for expired invitations
- [ ] Invited users can accept invitation and set password
- [ ] JWT token returned upon successful invitation acceptance
- [ ] Non-admin users cannot access admin endpoints (403)
- [ ] Requests without token are rejected (401)
- [ ] All validation rules are enforced

## Next Steps

After successful testing:

1. **Implement Login Endpoint** (if not already done)
2. **Add Automated Tests** (unit + integration)
3. **Implement Frontend** (React/Vue/Angular)
4. **Configure Production SMTP** (for email sending)
5. **Add Rate Limiting** (prevent invitation spam)
6. **Implement Invitation Resend** (for expired invitations)
7. **Add Audit Logging** (track admin actions)
8. **Setup Monitoring** (track invitation success rates)

## Support

For issues or questions:
- Check ADMIN_API_DOCUMENTATION.md for endpoint details
- Review IMPLEMENTATION_SUMMARY.md for architecture overview
- Check server console logs for detailed error messages
- Verify .env configuration matches .env.example

---

# Testing Guide: JWT Authentication with Refresh Token Rotation

This guide provides comprehensive testing instructions for the JWT-based authentication system with refresh token rotation.

## Prerequisites

1. **MongoDB Running:**
   ```bash
   # Start MongoDB (if not already running)
   mongod
   ```

2. **Environment Variables:**
   Ensure your `.env` file includes:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   ```

3. **Server Running:**
   ```bash
   npm run dev
   ```

4. **Test User:**
   You'll need a registered and verified user account for testing. You can use the existing registration and verification endpoints.

## Testing Tools

You can use any of the following tools to test the API:
- **cURL** (command line)
- **Postman** (GUI)
- **HTTPie** (command line)
- **Insomnia** (GUI)

## Part 1: User Registration and Verification

### Step 1: Register a Test User

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123",
    "name": "Test User",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email for a verification code.",
  "data": {
    "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "testuser@example.com",
    "name": "Test User",
    "isEmailVerified": false
  }
}
```

**Note:** Check the console for the 6-digit verification code if email is not configured.

### Step 2: Verify Email

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "verificationCode": "123456"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "email": "testuser@example.com",
      "name": "Test User",
      "dateOfBirth": "1995-05-15T00:00:00.000Z",
      "isEmailVerified": true,
      "role": "enduser"
    }
  }
}
```

## Part 2: Login and Token Generation

### Test 1: Successful Login

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWYxYTJiM2M0ZDVlNmY3ZzhoOWkwajEiLCJpYXQiOjE3MTA0MjAwMDAsImV4cCI6MTcxMDQyMDkwMH0...",
    "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0",
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "email": "testuser@example.com",
      "name": "Test User",
      "dateOfBirth": "1995-05-15T00:00:00.000Z",
      "role": "enduser",
      "isEmailVerified": true
    }
  }
}
```

**Save the tokens:**
```bash
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export REFRESH_TOKEN="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0..."
```

**Verify tokens in database:**
```bash
mongosh insurematch

db.users.findOne(
  { email: "testuser@example.com" },
  { refreshToken: 1, refreshTokenExpires: 1 }
)
```

**Expected:**
- `refreshToken` should be stored in the database
- `refreshTokenExpires` should be 7 days from now

### Test 2: Login with Invalid Email

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "SecurePass123"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Test 3: Login with Invalid Password

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "WrongPassword123"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Test 4: Login with Unverified Email

**Create an unverified user first, then:**

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@example.com",
    "password": "SecurePass123"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in",
  "requiresVerification": true
}
```

## Part 3: Using Access Tokens

### Test 5: Access Protected Route with Valid Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Test 6: Access Protected Route Without Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### Test 7: Access Protected Route with Invalid Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid token."
}
```

## Part 4: Token Refresh Flow

### Test 8: Refresh Token with Valid Refresh Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_ACCESS_TOKEN...",
    "refreshToken": "NEW_REFRESH_TOKEN_DIFFERENT_FROM_OLD_ONE..."
  }
}
```

**Important observations:**
- ✅ New access token is returned
- ✅ **New refresh token is returned** (rotation)
- ✅ Old refresh token is now invalid

**Verify in database:**
```bash
mongosh insurematch

db.users.findOne(
  { email: "testuser@example.com" },
  { refreshToken: 1 }
)
```

**Expected:** The `refreshToken` in database should match the NEW refresh token, not the old one.

### Test 9: Try Using Old Refresh Token (Should Fail)

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

**This confirms token rotation is working correctly!**

### Test 10: Refresh Token with Invalid Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "invalid-token-12345"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

### Test 11: Refresh Token After It Expires

**To test expiration, manually update the database:**

```bash
mongosh insurematch

db.users.updateOne(
  { email: "testuser@example.com" },
  { $set: { refreshTokenExpires: new Date("2020-01-01") } }
)
```

**Then try to refresh:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"YOUR_VALID_TOKEN\"
  }"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

## Part 5: Access Token Expiration Testing

### Test 12: Wait for Access Token to Expire

**Note:** By default, access tokens expire in 15 minutes. For faster testing, you can:

**Option A: Change expiration to 1 minute in .env:**
```env
JWT_ACCESS_EXPIRES_IN=1m
```

**Option B: Use a tool to generate an expired token manually**

**After token expires, try to access protected route:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $EXPIRED_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Token expired."
}
```

**Then refresh the token:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

**Use the new access token to retry the request.**

## Part 6: Logout Testing

### Test 13: Logout (Invalidates Refresh Token)

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Verify in database:**
```bash
mongosh insurematch

db.users.findOne(
  { email: "testuser@example.com" },
  { refreshToken: 1, refreshTokenExpires: 1 }
)
```

**Expected:**
- `refreshToken` should be `null`
- `refreshTokenExpires` should be `null`

### Test 14: Try to Refresh After Logout

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

## Part 7: Complete Authentication Flow Test

### Full Flow Test Sequence

1. **Register** → Get user ID
2. **Verify Email** → Get initial access token
3. **Login** → Get access token + refresh token
4. **Use Access Token** → Access protected routes
5. **Wait for Expiration** (or set short expiry) → Access token expires
6. **Refresh Token** → Get new access token + new refresh token
7. **Use New Access Token** → Access protected routes successfully
8. **Logout** → Refresh token invalidated
9. **Try to Refresh** → Should fail

**Automated Test Script (Bash):**

```bash
#!/bin/bash

BASE_URL="http://localhost:5000"
EMAIL="flowtest@example.com"
PASSWORD="SecurePass123"

echo "1. Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"Flow Test User\",
    \"dateOfBirth\": \"1995-05-15\"
  }")

echo $REGISTER_RESPONSE | jq '.'

echo "\n2. Check console for verification code, then verify email..."
read -p "Enter verification code: " CODE

VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"verificationCode\": \"$CODE\"
  }")

echo $VERIFY_RESPONSE | jq '.'

echo "\n3. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"

echo "\n4. Using access token to access protected route..."
PROTECTED_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

# This will logout, so we need to login again

echo "\n5. Login again for refresh test..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')

echo "\n6. Refreshing token..."
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo $REFRESH_RESPONSE | jq '.'

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.accessToken')
NEW_REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.refreshToken')

echo "\n7. Trying old refresh token (should fail)..."
OLD_REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo $OLD_REFRESH_RESPONSE | jq '.'

echo "\n8. Using new access token..."
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo $LOGOUT_RESPONSE | jq '.'

echo "\n9. Trying to refresh after logout (should fail)..."
FINAL_REFRESH=$(curl -s -X POST "$BASE_URL/api/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$NEW_REFRESH_TOKEN\"
  }")

echo $FINAL_REFRESH | jq '.'

echo "\n✅ Complete flow test finished!"
```

## Part 8: Test Case Matrix

| # | Test Case | Expected Status | Expected Result |
|---|-----------|----------------|-----------------|
| 1 | Login with valid credentials | 200 | Access + refresh tokens returned |
| 2 | Login with invalid email | 401 | "Invalid email or password" |
| 3 | Login with invalid password | 401 | "Invalid email or password" |
| 4 | Login with unverified email | 401 | "Please verify your email" |
| 5 | Access protected route with valid token | 200 | Success |
| 6 | Access protected route without token | 401 | "No token provided" |
| 7 | Access protected route with invalid token | 401 | "Invalid token" |
| 8 | Access protected route with expired token | 401 | "Token expired" |
| 9 | Refresh with valid refresh token | 200 | New tokens returned |
| 10 | Refresh with invalid refresh token | 401 | "Invalid or expired refresh token" |
| 11 | Refresh with expired refresh token | 401 | "Invalid or expired refresh token" |
| 12 | Use old refresh token after rotation | 401 | "Invalid or expired refresh token" |
| 13 | Logout with valid token | 200 | "Logout successful" |
| 14 | Refresh after logout | 401 | "Invalid or expired refresh token" |

## Part 9: Security Verification

### Verify Token Rotation
```bash
# Login
LOGIN1=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Pass123"}')

RT1=$(echo $LOGIN1 | jq -r '.data.refreshToken')

# Refresh
REFRESH1=$(curl -s -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$RT1\"}")

RT2=$(echo $REFRESH1 | jq -r '.data.refreshToken')

# Verify RT1 != RT2
if [ "$RT1" != "$RT2" ]; then
  echo "✅ Token rotation confirmed: Tokens are different"
else
  echo "❌ Token rotation failed: Tokens are the same"
fi

# Verify RT1 is now invalid
OLD_REFRESH=$(curl -s -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$RT1\"}")

if echo $OLD_REFRESH | grep -q "Invalid or expired"; then
  echo "✅ Old token invalidated correctly"
else
  echo "❌ Old token still valid (security issue!)"
fi
```

## Part 10: Performance Testing

### Test Token Generation Speed
```bash
time for i in {1..100}; do
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "Pass123"}' > /dev/null
done
```

## Troubleshooting

### Issue: "Token expired" immediately after login
- Check `JWT_ACCESS_EXPIRES_IN` in .env
- Ensure server time is correct (sync with NTP)
- Verify no time zone issues

### Issue: Refresh token not rotating
- Check database after refresh - `refreshToken` should change
- Verify the response includes a new `refreshToken`
- Check server logs for errors during token save

### Issue: "Invalid refresh token" even with valid token
- Verify token matches exactly (no extra spaces/newlines)
- Check database - ensure `refreshToken` and `refreshTokenExpires` are set
- Verify token hasn't expired in database

### Issue: Access token still works after expiration time
- JWT expiration is built into the token itself
- Server must reject expired tokens (middleware checks)
- Verify `JWT_ACCESS_EXPIRES_IN` is being used correctly

## Success Criteria Checklist

- [ ] User can login and receive both access and refresh tokens
- [ ] Access token expires after configured time (default 15 minutes)
- [ ] Refresh token expires after configured time (default 7 days)
- [ ] Refresh token can be used to get new access token
- [ ] Refresh token is rotated on each use (old token invalidated)
- [ ] Old refresh token cannot be reused
- [ ] Logout invalidates refresh token
- [ ] Cannot refresh after logout
- [ ] Protected routes require valid access token
- [ ] Expired access tokens are rejected
- [ ] Invalid tokens are rejected
- [ ] Unverified users cannot login
- [ ] Error messages are clear and appropriate

## Clean Up

```bash
# Remove test users
mongosh insurematch

db.users.deleteMany({
  email: { $regex: "test" }
})
```

## Next Steps

After successful testing:
1. Implement frontend integration
2. Add rate limiting to auth endpoints
3. Implement account lockout after failed attempts
4. Add multi-device session management
5. Implement "remember me" functionality
6. Add password reset flow
7. Consider adding multi-factor authentication (MFA)

---

# Testing Guide: Session Expiry with Warning and Logout

This guide provides comprehensive testing instructions for the session expiry warning and automatic logout functionality.

## Overview

The session expiry feature includes:
- **Warning Detection**: Middleware checks if access token expires within 5 minutes
- **Client Notification**: Response headers indicate session is expiring
- **Email Warning**: User receives email notification about impending expiry
- **Session Extension**: User can extend session using refresh token
- **Automatic Logout**: User is logged out when access token expires

## Prerequisites

1. **Server Running:**
   ```bash
   npm run dev
   ```

2. **Environment Variables:**
   Ensure your `.env` file includes:
   ```env
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   ```

3. **Test User:**
   You'll need a registered and verified user account.

## Part 1: Understanding Session Expiry Timing

### Default Configuration
- **Access Token Expiration**: 15 minutes (configurable via `JWT_ACCESS_EXPIRES_IN`)
- **Warning Threshold**: 5 minutes before expiration
- **Warning Window**: From minute 10 to minute 15 after login

### Adjusting for Testing

For faster testing, you can temporarily change the expiration time:

```env
# In .env file - set access token to expire in 6 minutes
JWT_ACCESS_EXPIRES_IN=6m
```

With this setting:
- **Access Token Expiration**: 6 minutes
- **Warning Threshold**: 5 minutes before expiration
- **Warning Window**: From minute 1 to minute 6 after login

Or even faster for rapid testing:

```env
# Access token expires in 5.5 minutes (330 seconds)
JWT_ACCESS_EXPIRES_IN=330s
```

With this setting, warnings appear within 30 seconds of login.

## Part 2: Session Expiry Warning Testing

### Test 1: Login and Access Protected Route

**Step 1: Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123"
  }'
```

**Save the tokens:**
```bash
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export REFRESH_TOKEN="a1b2c3d4e5f6g7h8i9j0..."
```

**Step 2: Access Protected Route (Before Warning Window)**

Within the first 10 minutes (or 1 minute with `JWT_ACCESS_EXPIRES_IN=6m`):

```bash
curl -i -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
- Status: 200 OK
- **No warning headers** (session not expiring yet)

### Test 2: Session Expiry Warning Detection

**Wait until warning window** (10-15 minutes with default, or 1-6 minutes with `JWT_ACCESS_EXPIRES_IN=6m`)

**Access any protected route:**
```bash
curl -i -X POST http://localhost:5000/api/auth/admin/create-platform-admin \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@example.com",
    "password": "AdminPass123",
    "name": "New Admin"
  }'
```

**Expected Response Headers:**
```
X-Session-Expiry-Warning: true
X-Session-Expires-In: 298
```

**Where:**
- `X-Session-Expiry-Warning: true` - Indicates session is expiring soon
- `X-Session-Expires-In: 298` - Seconds until expiration (approximately)

**Expected Console Output:**
```
=== SESSION EXPIRY WARNING EMAIL SIMULATION ===
To: testuser@example.com
Subject: Session Expiry Warning - InsureMatch
Session expires in: 5 minute(s)
===============================================
```

### Test 3: Multiple Warning Triggers

The middleware will send email warnings, but to prevent spam, consider that:
- Email is sent on **first request** in warning window
- Subsequent requests still set headers but may want to throttle emails

**Make multiple requests in warning window:**
```bash
# Request 1
curl -i -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Wait 30 seconds

# Request 2
curl -i -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected:**
- Both requests should include warning headers
- Email sent on each request (consider implementing throttling in production)

## Part 3: Session Extension Testing

### Test 4: Extend Session Before Expiry

**When you receive session expiry warning:**

```bash
curl -X POST http://localhost:5000/api/auth/extend-session \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Session extended successfully",
  "data": {
    "accessToken": "NEW_ACCESS_TOKEN...",
    "refreshToken": "NEW_REFRESH_TOKEN...",
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "email": "testuser@example.com",
      "name": "Test User",
      "role": "enduser"
    }
  }
}
```

**Save new tokens:**
```bash
export ACCESS_TOKEN="NEW_ACCESS_TOKEN..."
export REFRESH_TOKEN="NEW_REFRESH_TOKEN..."
```

**Verify session extended:**
```bash
curl -i -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected:**
- No warning headers (new token is fresh)
- Session successfully extended

### Test 5: Extend Session vs Refresh Token

**Note:** Both endpoints do the same thing (refresh the token):

```bash
# Method 1: extend-session (explicit intent)
curl -X POST http://localhost:5000/api/auth/extend-session \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Method 2: refresh-token (general purpose)
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

Both endpoints:
- Generate new access token
- Rotate refresh token
- Extend session

## Part 4: Automatic Logout Testing

### Test 6: Wait for Token Expiration

**Option A: Wait for natural expiration**
- Wait for full expiration time (15 minutes by default)

**Option B: Use short expiration for testing**
```env
# .env
JWT_ACCESS_EXPIRES_IN=2m
```

**After token expires, try to access protected route:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $EXPIRED_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Token expired."
}
```

**This simulates automatic logout** - the client should:
1. Detect the 401 error with "Token expired" message
2. Clear local storage
3. Redirect to login page
4. Optionally notify user about session expiration

## Part 5: Email Notification Testing

### Test 7: Verify Email Content

**With SMTP Configured:**
1. Configure SMTP settings in `.env`
2. Trigger session warning
3. Check email inbox for warning

**Without SMTP (Development):**
1. Leave `EMAIL_HOST` empty in `.env`
2. Trigger session warning
3. Check console output:

```
=== SESSION EXPIRY WARNING EMAIL SIMULATION ===
To: testuser@example.com
Subject: Session Expiry Warning - InsureMatch
Session expires in: 5 minute(s)
===============================================
```

**Email Content Should Include:**
- Warning about session expiring
- Time until expiration
- Instructions to extend session
- Information about what happens if session expires

## Part 6: Integration Testing Scenarios

### Scenario 1: User Extends Session in Time

1. **Login** → Get tokens
2. **Work normally** → No warnings
3. **Receive warning** (10 minutes) → Headers indicate expiry
4. **Extend session** → New tokens issued
5. **Continue working** → Session extended successfully

### Scenario 2: User Ignores Warning

1. **Login** → Get tokens
2. **Work normally** → No warnings
3. **Receive warning** (10 minutes) → User ignores
4. **Token expires** (15 minutes) → Automatic logout
5. **Try to access** → 401 Unauthorized
6. **Must re-login** → Enter credentials again

### Scenario 3: Multiple Devices

1. **Login on Device A** → Token A
2. **Login on Device B** → Token B (different refresh token)
3. **Warning on Device A** → Extend session on A only
4. **Device B** → Still has original expiration
5. **Both devices** → Independent session management

## Part 7: Complete Test Script

**Automated Testing Script (Bash):**

```bash
#!/bin/bash

BASE_URL="http://localhost:5000"
EMAIL="sessiontest@example.com"
PASSWORD="SecurePass123"

echo "=== SESSION EXPIRY TESTING ==="
echo ""

# Step 1: Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')

echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."
echo ""

# Step 2: Access protected route (no warning yet)
echo "2. Accessing protected route (early in session)..."
RESPONSE=$(curl -i -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" 2>&1)

if echo "$RESPONSE" | grep -q "X-Session-Expiry-Warning"; then
  echo "⚠️  Warning detected (unexpected at this stage)"
else
  echo "✅ No warning (expected - session is fresh)"
fi
echo ""

# Step 3: Wait for warning window
echo "3. Waiting for warning window..."
echo "   (Configure JWT_ACCESS_EXPIRES_IN=330s in .env for faster testing)"
echo "   Press Ctrl+C to skip waiting, or wait for warning window..."
read -t 600 -p "   Waiting... (or press Enter when ready)" || true
echo ""

# Step 4: Login again for fresh test
echo "4. Logging in again for warning test..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')
echo ""

# Step 5: Decode token to check expiry
echo "5. Checking token expiration time..."
# Note: This requires 'jq' and base64 decoding
PAYLOAD=$(echo $ACCESS_TOKEN | cut -d '.' -f 2)
# Add padding if needed
PADDING=$((4 - ${#PAYLOAD} % 4))
if [ $PADDING -ne 4 ]; then
  PAYLOAD="${PAYLOAD}$(printf '=%.0s' $(seq 1 $PADDING))"
fi
DECODED=$(echo $PAYLOAD | base64 -d 2>/dev/null | jq '.')
echo "$DECODED"
echo ""

# Step 6: Test session extension
echo "6. Testing session extension..."
EXTEND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/extend-session" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

NEW_ACCESS_TOKEN=$(echo $EXTEND_RESPONSE | jq -r '.data.accessToken')

if [ "$NEW_ACCESS_TOKEN" != "null" ] && [ -n "$NEW_ACCESS_TOKEN" ]; then
  echo "✅ Session extended successfully"
  echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
else
  echo "❌ Session extension failed"
  echo "$EXTEND_RESPONSE"
fi
echo ""

echo "=== TEST COMPLETE ==="
```

**Save as `test_session_expiry.sh` and run:**
```bash
chmod +x test_session_expiry.sh
./test_session_expiry.sh
```

## Part 8: Test Case Matrix

| # | Test Case | Expected Status | Expected Headers | Expected Result |
|---|-----------|-----------------|------------------|-----------------|
| 1 | Access route with fresh token (< 10 min) | 200 | No warning headers | Request succeeds |
| 2 | Access route in warning window (10-15 min) | 200 | X-Session-Expiry-Warning: true | Request succeeds + warning |
| 3 | Access route with expired token (> 15 min) | 401 | None | "Token expired" error |
| 4 | Extend session with valid refresh token | 200 | None | New tokens issued |
| 5 | Extend session with invalid refresh token | 401 | None | "Invalid refresh token" |
| 6 | Multiple requests in warning window | 200 | Warning headers on all | Email sent (may throttle) |
| 7 | Extend session, then access route | 200 | No warning headers | Fresh session, no warning |

## Part 9: Frontend Integration Checklist

When integrating with frontend:

### Response Header Monitoring
```javascript
// Check for session expiry warning in response headers
const checkSessionExpiry = (response) => {
  const expiryWarning = response.headers.get('X-Session-Expiry-Warning');
  const expiresIn = response.headers.get('X-Session-Expires-In');

  if (expiryWarning === 'true') {
    const minutes = Math.ceil(parseInt(expiresIn) / 60);
    showSessionWarningModal(minutes);
  }
};
```

### Session Warning Modal
```javascript
// Display modal to user
const showSessionWarningModal = (minutesLeft) => {
  // Show modal: "Your session will expire in {minutesLeft} minutes"
  // Options:
  // 1. "Extend Session" → Call /api/auth/extend-session
  // 2. "Logout Now" → Call /api/auth/logout
  // 3. "Continue Working" → Dismiss (will auto-logout on expiry)
};
```

### Automatic Token Refresh
```javascript
// On user choosing to extend session
const extendSession = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('/api/auth/extend-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    hideSessionWarningModal();
  }
};
```

### Automatic Logout on Expiry
```javascript
// Handle 401 errors from token expiration
const handleApiError = (error) => {
  if (error.message === 'Token expired.') {
    // Clear tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Show notification
    showNotification('Your session has expired. Please login again.');

    // Redirect to login
    window.location.href = '/login';
  }
};
```

## Part 10: Security Considerations

### Warning Throttling
Consider implementing throttling to prevent email spam:

```javascript
// In middleware/auth.js, track last warning time
const lastWarningTime = new Map();

// Only send email if last warning was > 2 minutes ago
const userId = decoded.userId;
const now = Date.now();
const lastWarning = lastWarningTime.get(userId);

if (!lastWarning || now - lastWarning > 2 * 60 * 1000) {
  sendSessionExpiryWarningEmail(user.email, user.name, timeUntilExpiry);
  lastWarningTime.set(userId, now);
}
```

### Unsaved Data Handling
- Frontend should warn users about unsaved data
- Consider implementing auto-save functionality
- Provide clear warning before automatic logout

## Troubleshooting

### Issue: No warning headers even in warning window
**Solution:**
- Check `JWT_ACCESS_EXPIRES_IN` is set correctly
- Verify token is not already expired
- Ensure `checkSessionExpiry` middleware is applied to route
- Check server logs for middleware errors

### Issue: Warning appears immediately after login
**Solution:**
- Token expiration time may be too short
- Check `JWT_ACCESS_EXPIRES_IN` value
- Verify server time is correct

### Issue: Email not sent
**Solution:**
- Check EMAIL_HOST configuration
- Look for email in console logs (development mode)
- Check server logs for email errors
- Verify user email exists in database

### Issue: Session extension fails
**Solution:**
- Ensure refresh token is valid and not expired
- Check refresh token hasn't been used before (rotation)
- Verify user exists in database
- Check server logs for specific error

## Success Criteria Checklist

- [ ] User receives warning when session expires within 5 minutes
- [ ] Warning headers (`X-Session-Expiry-Warning`, `X-Session-Expires-In`) are present in response
- [ ] Email notification sent to user about session expiry
- [ ] User can extend session using refresh token via `/api/auth/extend-session`
- [ ] Session extension provides new access token and refresh token
- [ ] Old refresh token is invalidated after extension (rotation)
- [ ] Expired access tokens result in 401 error
- [ ] Automatic logout occurs when token expires
- [ ] Multiple requests in warning window all include warning headers
- [ ] Session extension resets the warning timer
- [ ] Email content is clear and actionable

## Next Steps

After successful testing:
1. Implement frontend warning modal/notification
2. Add session extension UI in frontend
3. Implement auto-save for unsaved data
4. Add session expiry countdown timer in UI
5. Consider adding "remember me" to extend refresh token life
6. Implement session activity tracking
7. Add analytics for session expiry patterns
8. Consider implementing session throttling for email warnings
