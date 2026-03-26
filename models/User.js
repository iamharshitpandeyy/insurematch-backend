const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(v) {
        const today = new Date();
        const birthDate = new Date(v);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          return age - 1 >= 18;
        }
        return age >= 18;
      },
      message: 'User must be at least 18 years old'
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ['enduser', 'broker', 'admin', 'platform_admin', 'insurer_admin', 'insurer_agent'],
    default: 'enduser'
  },
  invitationToken: {
    type: String,
    default: null
  },
  invitationExpiresAt: {
    type: Date,
    default: null
  },
  insurerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Insurer',
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate verification code
userSchema.methods.generateVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationCode = code;
  this.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return code;
};

// Method to verify code
userSchema.methods.verifyCode = function(code) {
  if (!this.emailVerificationCode || !this.emailVerificationExpires) {
    return false;
  }

  if (this.emailVerificationExpires < new Date()) {
    return false;
  }

  return this.emailVerificationCode === code;
};

// Method to generate invitation token
userSchema.methods.generateInvitationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.invitationToken = token;
  this.invitationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
  return token;
};

// Method to verify invitation token
userSchema.methods.verifyInvitationToken = function(token) {
  if (!this.invitationToken || !this.invitationExpiresAt) {
    return false;
  }

  if (this.invitationExpiresAt < new Date()) {
    return false;
  }

  return this.invitationToken === token;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
