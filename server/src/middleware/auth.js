import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('organization', 'name _id')
      .populate('teams.team', 'name _id');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not found.' });
    }
    
    // Check email verification status
    if (!user.verified_email && 
        !req.path.includes('/auth/verify-email') && 
        !req.path.includes('/auth/resend-verification')) {
      return res.status(403).json({ 
        message: 'Your email is not verified. Please verify to continue.',
        resend: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Alias for backward compatibility
export const protect = authenticate;

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

// Admin middleware - allows super_admin and org_admin roles
export const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'super_admin' || req.user.role === 'org_admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};