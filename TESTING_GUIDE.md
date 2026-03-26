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
