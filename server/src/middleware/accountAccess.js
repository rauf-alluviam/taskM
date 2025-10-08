// middleware/auth/accountAccess.js
import AccountEntry from '../../model/accounts/AccountEntry.js';
import MasterType from '../../model/accounts/MasterType.js';

// Check if user can view account entries
export const canViewAccountEntry = async (req, res, next) => {
  try {
    const { accountEntryId } = req.params;
    const user = req.user;
    
    const accountEntry = await AccountEntry.findById(accountEntryId)
      .populate('organization')
      .populate('createdBy');
    
    if (!accountEntry) {
      return res.status(404).json({ error: 'Account entry not found' });
    }
    
    // Check if user belongs to the same organization
    if (!accountEntry.organization._id.equals(user.organization)) {
      return res.status(403).json({ error: 'Access denied. Not a member of this organization' });
    }
    
    req.accountEntry = accountEntry;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error during access check' });
  }
};

// Check if user can modify account entry
export const canModifyAccountEntry = async (req, res, next) => {
  try {
    const { accountEntryId } = req.params;
    const user = req.user;
    
    const accountEntry = await AccountEntry.findById(accountEntryId);
    
    if (!accountEntry) {
      return res.status(404).json({ error: 'Account entry not found' });
    }
    
    // Check organization membership
    if (!accountEntry.organization.equals(user.organization)) {
      return res.status(403).json({ error: 'Access denied. Not a member of this organization' });
    }
    
    // Check if user is creator or has admin role
    const isCreator = accountEntry.createdBy.equals(user._id);
    const isAdmin = user.role === 'org_admin' || user.role === 'super_admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ 
        error: 'Access denied. Only creator or organization admins can modify this entry' 
      });
    }
    
    req.accountEntry = accountEntry;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error during modification check' });
  }
};

// Check if user can view master types
export const canViewMasterType = async (req, res, next) => {
  try {
    const { masterTypeId } = req.params;
    const user = req.user;
    
    const masterType = await MasterType.findById(masterTypeId);
    
    if (!masterType) {
      return res.status(404).json({ error: 'Master type not found' });
    }
    
    // Check if user belongs to the same organization
    if (!masterType.organization.equals(user.organization)) {
      return res.status(403).json({ error: 'Access denied. Not a member of this organization' });
    }
    
    req.masterType = masterType;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error during master type access check' });
  }
};

// Check if user can modify master type
export const canModifyMasterType = async (req, res, next) => {
  try {
    const { masterTypeId } = req.params;
    const user = req.user;
    
    const masterType = await MasterType.findById(masterTypeId);
    
    if (!masterType) {
      return res.status(404).json({ error: 'Master type not found' });
    }
    
    // Check organization membership
    if (!masterType.organization.equals(user.organization)) {
      return res.status(403).json({ error: 'Access denied. Not a member of this organization' });
    }
    
    // Check if user is creator or has admin role
    const isCreator = masterType.createdBy.equals(user._id);
    const isAdmin = user.role === 'org_admin' || user.role === 'super_admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ 
        error: 'Access denied. Only creator or organization admins can modify this master type' 
      });
    }
    
    req.masterType = masterType;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error during master type modification check' });
  }
};