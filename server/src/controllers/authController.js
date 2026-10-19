import crypto from 'crypto';
import { User, AuditLog } from '../models/index.js';

export class AuthController {
  // Register customer
  static async registerCustomer(req, res, next) {
    try {
      const { email, password, fullName, phone, shippingAddress, paypalVaultId } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const user = await User.create({
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'customer',
        customerProfile: {
          fullName: fullName || email.split('@')[0],
          phone: phone || '',
          shippingAddress: shippingAddress || {},
          paypalVaultId: paypalVaultId || '',
        },
      });

      await AuditLog.create({
        actorType: 'human_user',
        actorId: user.email,
        action: 'CUSTOMER_REGISTERED',
        entityType: 'user',
        entityId: user._id.toString(),
        details: { role: 'customer' },
      });

      res.status(201).json({
        message: 'Customer registered successfully',
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          customerProfile: user.customerProfile,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // Register business
  static async registerBusiness(req, res, next) {
    try {
      const { email, password, businessName, category, description, paypalMerchantId } = req.body;

      if (!email || !password || !businessName || !category) {
        return res.status(400).json({ error: 'Email, password, businessName, and category are required' });
      }

      const validCategories = ['goods', 'service', 'rental', 'grocery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
      }

      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const user = await User.create({
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'business',
        businessProfile: {
          businessName,
          category,
          description: description || '',
          paypalMerchantId: paypalMerchantId || 'merchant@sandbox.paypal.com',
          rating: 5.0,
          disputeRate: 0.0,
          verified: true,
        },
      });

      await AuditLog.create({
        actorType: 'human_user',
        actorId: user.email,
        action: 'BUSINESS_REGISTERED',
        entityType: 'user',
        entityId: user._id.toString(),
        details: { role: 'business', category, businessName },
      });

      res.status(201).json({
        message: 'Business registered successfully',
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          businessProfile: user.businessProfile,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // Login
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      await AuditLog.create({
        actorType: 'human_user',
        actorId: user.email,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: user._id.toString(),
        details: { role: user.role },
      });

      res.json({
        token: `mock-jwt-token-${user._id}`,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          customerProfile: user.customerProfile,
          businessProfile: user.businessProfile,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // Get current user profile
  static async getMe(req, res, next) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const user = await User.findById(req.user._id).select('-passwordHash');
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  // List users for demo switching
  static async listUsers(req, res, next) {
    try {
      const { role } = req.query;
      const query = role ? { role } : {};
      const users = await User.find(query).select('-passwordHash');
      res.json(users);
    } catch (err) {
      next(err);
    }
  }
}
