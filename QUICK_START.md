# Quick Start Guide: Platform Admin & Invitation System

## 🚀 Getting Started in 5 Minutes

This guide will help you quickly test the new Platform Admin and invitation features.

### Step 1: Install & Setup (1 minute)

```bash
# Install dependencies (if not already done)
npm install

# Start MongoDB
mongod

# Start the server in a new terminal
npm run dev
```

### Step 2: Create First Platform Admin (30 seconds)

```bash
# In a new terminal, run the seed script
npm run seed:admin
```

**Output:**
```
✓ Connected to MongoDB
✓ Platform Admin created successfully!

Admin Credentials:
  Email: admin@insurematch.com
  Password: AdminPass123

⚠ IMPORTANT: Change the default password immediately after first login!
```

### Step 3: Login as Platform Admin (30 seconds)

**Note:** Since we don't have a dedicated login endpoint in the original code, use this temporary login function:

Create a quick test file `test-login.js`:

```javascript
const axios = require('axios');

async function login(email, password) {
  try {
    // For now, we'll use the verify-email endpoint with a workaround
    // In production, implement a proper login endpoint
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    });
    console.log('JWT Token:', response.data.data.token);
    return response.data.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

login('admin@insurematch.com', 'AdminPass123');
```

**OR** Add this to `routes/auth.js` temporarily:

```javascript
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', { expiresIn: '7d' });
  res.json({ success: true, data: { token, user: { id: user._id, email: user.email, name: user.name, role: user.role } } });
});
```

Then login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@insurematch.com","password":"AdminPass123"}'
```

**Save the token!**

### Step 4: Invite an Insurer Admin (1 minute)

```bash
export TOKEN="YOUR_JWT_TOKEN_FROM_STEP_3"

curl -X POST http://localhost:5000/api/auth/admin/invite-insurer-admin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "insureradmin@test.com",
    "name": "Test Insurer Admin"
  }'
```

**Check your console output** for the invitation link (since SMTP is not configured in dev):

```
=== EMAIL SIMULATION ===
To: insureradmin@test.com
Subject: You're Invited to Join InsureMatch as Insurer Admin
Role: Insurer Admin
Invitation Link: http://localhost:3000/accept-invitation?token=abc123...&email=insureradmin%40test.com
========================
```

**Copy the token from the invitation link!**

### Step 5: Accept the Invitation (1 minute)

```bash
curl -X POST http://localhost:5000/api/auth/accept-invitation \
  -H "Content-Type: application/json" \
  -d '{
    "email": "insureradmin@test.com",
    "token": "TOKEN_FROM_INVITATION_LINK",
    "password": "NewSecurePass123"
  }'
```

**Success!** You should receive:
```json
{
  "success": true,
  "message": "Invitation accepted successfully! Your account is now active.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "insureradmin@test.com",
      "name": "Test Insurer Admin",
      "role": "insurer_admin",
      "isEmailVerified": true
    }
  }
}
```

## 🎉 Success!

You've successfully:
- ✅ Created a Platform Admin
- ✅ Logged in as Platform Admin
- ✅ Sent an invitation to an Insurer Admin
- ✅ Accepted the invitation and created the Insurer Admin account

## 📖 Next Steps

1. **Read the full documentation:**
   - [ADMIN_API_DOCUMENTATION.md](./ADMIN_API_DOCUMENTATION.md) - Complete API reference
   - [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Comprehensive testing guide
   - [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details

2. **Import Postman Collection:**
   - Import `postman_collection.json` into Postman
   - Set your JWT token in the collection variables
   - Test all endpoints easily

3. **Try more features:**
   - Create additional Platform Admins
   - Invite Insurer Agents
   - Test expired invitation links
   - Test authorization (try accessing admin endpoints without proper role)

4. **Configure for production:**
   - Set up SMTP in `.env` for real email delivery
   - Change JWT_SECRET to a strong random value
   - Set FRONTEND_URL to your actual frontend URL
   - Implement proper login endpoint
   - Add rate limiting
   - Set up monitoring

## 🔥 Quick Test Commands

```bash
# Create Platform Admin
npm run seed:admin

# Start server
npm run dev

# Health check
curl http://localhost:5000/health

# Invite Insurer Admin (replace $TOKEN with your JWT)
curl -X POST http://localhost:5000/api/auth/admin/invite-insurer-admin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"Test User"}'

# Invite Insurer Agent (replace $TOKEN with your JWT)
curl -X POST http://localhost:5000/api/auth/admin/invite-insurer-agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@test.com","name":"Test Agent"}'

# Accept invitation (replace TOKEN and EMAIL)
curl -X POST http://localhost:5000/api/auth/accept-invitation \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","token":"YOUR_TOKEN","password":"NewPass123"}'
```

## ⚠️ Important Notes

1. **Email Configuration:** In development, emails log to console. Configure SMTP for production.
2. **Security:** Change default admin password immediately!
3. **Invitation Expiry:** Invitation links expire after exactly 48 hours.
4. **Login Endpoint:** Consider implementing a dedicated login endpoint for production use.
5. **Database:** Make sure MongoDB is running before starting the server.

## 🆘 Troubleshooting

**Problem:** "Access denied. No token provided."
- **Solution:** Make sure you include the Authorization header with your JWT token

**Problem:** "Access denied. Insufficient permissions."
- **Solution:** Only Platform Admins can access admin endpoints. Make sure you're logged in as a Platform Admin.

**Problem:** "Invalid or expired invitation link."
- **Solution:**
  - Check that you're using the correct token
  - Invitation may have expired (48 hours)
  - Request a new invitation

**Problem:** MongoDB connection error
- **Solution:** Make sure MongoDB is running (`mongod` command)

**Problem:** Emails not sending
- **Solution:** This is expected in development. Check console logs for simulated emails.

## 📞 Support

For detailed information:
- See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing instructions
- See [ADMIN_API_DOCUMENTATION.md](./ADMIN_API_DOCUMENTATION.md) for complete API documentation
- Check server console logs for detailed error messages

Happy testing! 🚀
