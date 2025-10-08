import express from "express";
import MasterType from "../../models/accounts/MasterType.js";
import AccountEntry from "../../models/accounts/AccountEntry.js";
import User from "../../models/User.js";
import Organization from "../../models/Organization.js";
import AccountHistory from "../../models/accounts/AccountHistory.js";
import { accountEmailService } from "../../services/accountEmailService.js";
import {authenticate} from "../../middleware/auth.js";

const router = express.Router();

// // Apply auth middleware to all routes
// router.use(authenticate);

// MASTER TYPES ROUTES WITH ORGANIZATION ACCESS CONTROL

// Get all master types for current organization
router.get('/master-types', authenticate , async (req, res) => {
  try {
    const user = req.user;
    const masterTypes = await MasterType.find({ 
      organization: user.organization,
      isActive: true 
    }).sort({ name: 1 });
    res.json(masterTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific master type (organization scoped)
router.get('/master-types/:id', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const masterType = await MasterType.findOne({ 
      _id: req.params.id,
      organization: user.organization 
    });
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json(masterType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new master type (with organization and creator)
router.post('/master-types', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { name, fields } = req.body;
    
    // Check if master type already exists in organization
    const existingMasterType = await MasterType.findOne({ 
      name, 
      organization: user.organization,
      isActive: true 
    });
    if (existingMasterType) {
      return res.status(400).json({ message: 'Master type already exists in your organization' });
    }

    const masterType = new MasterType({
      name,
      fields: fields || [],
      organization: user.organization,
      createdBy: user._id,
      isActive: true
    });
    
    const newMasterType = await masterType.save();
    res.status(201).json(newMasterType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a master type structure (creator or admin only)
router.put('/master-types/:id', authenticate,  async (req, res) => {
  try {
    const user = req.user;
    const { name, fields } = req.body;
    
    const masterType = await MasterType.findOne({ 
      _id: req.params.id,
      organization: user.organization 
    });
    
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });

    // Check permissions: creator or admin
    const isCreator = masterType.createdBy.equals(user._id);
    const isAdmin = user.role === 'org_admin' || user.role === 'super_admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. Only creator or organization admins can modify master types' 
      });
    }

    const updatedMasterType = await MasterType.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        fields,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    res.json(updatedMasterType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a master type (soft delete - creator or admin only)
router.delete('/master-types/:id',  authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    const masterType = await MasterType.findOne({ 
      _id: req.params.id,
      organization: user.organization 
    });
    
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });

    // Check permissions: creator or admin
    const isCreator = masterType.createdBy.equals(user._id);
    const isAdmin = user.role === 'org_admin' || user.role === 'super_admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. Only creator or organization admins can delete master types' 
      });
    }

    const updatedMasterType = await MasterType.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    res.json({ message: 'Master type deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MASTER DATA ENTRIES ROUTES WITH ORGANIZATION ACCESS CONTROL

// Create a new master entry (with organization and creator)
router.post('/masters', authenticate,  async (req, res) => {
  try {
    const user = req.user;
    const { masterType, defaultFields, customFields } = req.body;
    
    // Find or create master type if it doesn't exist in organization
    let masterTypeDoc = await MasterType.findOne({ 
      name: masterType, 
      organization: user.organization,
      isActive: true 
    });
    
    if (!masterTypeDoc) {
      // Create new master type with custom fields structure
      masterTypeDoc = new MasterType({
        name: masterType,
        fields: customFields.map(cf => ({
          name: cf.name,
          type: cf.type,
          required: cf.required || false
        })),
        organization: user.organization,
        createdBy: user._id,
        isActive: true
      });
      await masterTypeDoc.save();
    }

    // Create the actual master entry
    const accountEntry = new AccountEntry({
      masterTypeId: masterTypeDoc._id,
      masterTypeName: masterType,
      organization: user.organization,
      createdBy: user._id,
      defaultFields: {
        companyName: defaultFields.companyName,
        address: defaultFields.address,
        billingDate: defaultFields.billingDate,
        dueDate: defaultFields.dueDate,
        reminder: defaultFields.reminder
      },
      customFields: customFields.map(cf => ({
        name: cf.name,
        value: cf.value,
        type: cf.type,
        required: cf.required || false
      }))
    });

    const newEntry = await accountEntry.save();
    await newEntry.populate('masterTypeId');

    // Create history record
    const history = new AccountHistory({
      accountEntryId: newEntry._id,
      userId: user._id,
      action: 'created',
      details: {
        masterType: masterType,
        companyName: defaultFields.companyName
      }
    });
    await history.save();

    // Send account creation notification to creator
    await accountEmailService.sendAccountCreatedEmail(
      user.email,
      user.name,
      {
        ...newEntry.defaultFields,
        masterTypeName: masterType
      }
    );

    res.status(201).json(newEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all master entries for current organization
router.get('/masters', authenticate,  async (req, res) => {
  try {
    const user = req.user;
    const entries = await AccountEntry.find({ 
      organization: user.organization 
    })
    .populate('masterTypeId')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get master entries by master type (organization scoped)
router.get('/masters/type/:masterType', authenticate,  async (req, res) => {
  try {
    const user = req.user;
    const masterType = req.params.masterType;
    
    const entries = await AccountEntry.find({ 
      masterTypeName: masterType,
      organization: user.organization 
    })
    .populate('masterTypeId')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific master entry (organization scoped)
router.get('/masters/:id',  authenticate, async (req, res) => {
  try {
    const user = req.user;
    const entry = await AccountEntry.findOne({ 
      _id: req.params.id,
      organization: user.organization 
    }).populate('masterTypeId');
    
    if (!entry) return res.status(404).json({ message: 'Master entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a master entry (creator or admin only)
router.put('/masters/:id',  authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { defaultFields, customFields } = req.body;
    
    const entry = await AccountEntry.findOne({ 
      _id: req.params.id,
      organization: user.organization 
    });
    
    if (!entry) return res.status(404).json({ message: 'Master entry not found' });

    // Check permissions: creator or admin
    const isCreator = entry.createdBy.equals(user._id);
    const isAdmin = user.role === 'org_admin' || user.role === 'super_admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. Only creator or organization admins can modify this entry' 
      });
    }

    const updatedEntry = await AccountEntry.findByIdAndUpdate(
      req.params.id,
      {
        defaultFields,
        customFields,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('masterTypeId');

    // Create history record
    const history = new AccountHistory({
      accountEntryId: updatedEntry._id,
      userId: user._id,
      action: 'updated',
      details: {
        updatedFields: Object.keys(req.body),
        updatedBy: user.name
      }
    });
    await history.save();

    res.json(updatedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a master entry (creator or admin only)
router.delete('/masters/:id', authenticate,  async (req, res) => {
  try {
    const user = req.user;
    
    const entry = await AccountEntry.findOne({ 
      _id: req.params.id,
      organization: user.organization 
    });
    
    if (!entry) return res.status(404).json({ message: 'Master entry not found' });

    // Check permissions: creator or admin
    const isCreator = entry.createdBy.equals(user._id);
    const isAdmin = user.role === 'org_admin' || user.role === 'super_admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. Only creator or organization admins can delete this entry' 
      });
    }

    await AccountEntry.findByIdAndDelete(req.params.id);

    // Create history record
    const history = new AccountHistory({
      accountEntryId: entry._id,
      userId: user._id,
      action: 'deleted',
      details: {
        companyName: entry.defaultFields.companyName,
        deletedBy: user.name
      }
    });
    await history.save();

    res.json({ message: 'Master entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADDITIONAL UTILITY ROUTES WITH ORGANIZATION SCOPE

// Get master type structure by name (for form building)
router.get('/master-types/by-name/:name',  authenticate, async (req, res) => {
  try {
    const user = req.user;
    const masterType = await MasterType.findOne({ 
      name: req.params.name, 
      organization: user.organization,
      isActive: true 
    });
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json(masterType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search masters by company name (organization scoped)
router.get('/masters/search/:query',  authenticate, async (req, res) => {
  try {
    const user = req.user;
    const query = req.params.query;
    const entries = await AccountEntry.find({
      'defaultFields.companyName': { $regex: query, $options: 'i' },
      organization: user.organization
    })
    .populate('masterTypeId')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get account entry history
router.get('/masters/:id/history',  authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Verify the entry exists and belongs to organization
    const entry = await AccountEntry.findOne({
      _id: id,
      organization: user.organization
    });

    if (!entry) {
      return res.status(404).json({ message: 'Account entry not found' });
    }

    // Get entry history
    const history = await AccountHistory.find({ accountEntryId: id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      entry,
      history
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;