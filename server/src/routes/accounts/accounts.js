// routes/master.js
import express from "express";
import MasterType from "../../models/accounts/MasterType.js";
import AccountEntry from "../../models/accounts/AccountEntry.js";

const router = express.Router();

// MASTER TYPES ROUTES
// Get all master types (for dropdown selection)
router.get('/master-types', async (req, res) => {
  try {
    const masterTypes = await MasterType.find({ isActive: true }).sort({ name: 1 });
    res.json(masterTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific master type
router.get('/master-types/:id', async (req, res) => {
  try {
    const masterType = await MasterType.findById(req.params.id);
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json(masterType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new master type (structure/template)
router.post('/master-types', async (req, res) => {
  try {
    const { name, fields } = req.body;
    
    // Check if master type already exists
    const existingMasterType = await MasterType.findOne({ name, isActive: true });
    if (existingMasterType) {
      return res.status(400).json({ message: 'Master type already exists' });
    }

    const masterType = new MasterType({
      name,
      fields: fields || [],
      isActive: true
    });
    
    const newMasterType = await masterType.save();
    res.status(201).json(newMasterType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a master type structure
router.put('/master-types/:id', async (req, res) => {
  try {
    const { name, fields } = req.body;
    const masterType = await MasterType.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        fields,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json(masterType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a master type (soft delete)
router.delete('/master-types/:id', async (req, res) => {
  try {
    const masterType = await MasterType.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json({ message: 'Master type deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MASTER DATA ENTRIES ROUTES
// Create a new master entry (actual data)
router.post('/masters', async (req, res) => {
  try {
    const { masterType, defaultFields, customFields } = req.body;
    const userId = req.user.id; // Assuming you have auth middleware setting user
    
    // Find or create master type if it doesn't exist
    let masterTypeDoc = await MasterType.findOne({ name: masterType, status: 'active' });
    if (!masterTypeDoc) {
      // Create new master type with custom fields structure
      masterTypeDoc = new MasterType({
        name: masterType,
        customFields: customFields.map(cf => ({
          name: cf.name,
          type: cf.type,
          required: cf.required || false,
          validation: cf.validation || {},
          description: cf.description
        })),
        metadata: {
          createdBy: userId,
          version: 1
        },
        status: 'active'
      });
      await masterTypeDoc.save();
    }

    // Create the actual master entry
    const accountEntry = new AccountEntry({
      masterTypeId: masterTypeDoc._id,
      masterTypeName: masterType,
      defaultFields: {
        companyName: {
          value: defaultFields.companyName,
          lastUpdated: new Date()
        },
        address: {
          value: defaultFields.address,
          lastUpdated: new Date()
        },
        billingDate: {
          value: defaultFields.billingDate,
          lastUpdated: new Date()
        },
        dueDate: {
          value: defaultFields.dueDate,
          lastUpdated: new Date()
        },
        reminder: {
          frequency: defaultFields.reminder || 'monthly',
          lastSent: null,
          nextReminder: null
        }
      },
      customFields: customFields.map(cf => ({
        name: cf.name,
        value: cf.value,
        type: cf.type,
        lastUpdated: new Date()
      })),
      reminderStatus: {
        shouldSendReminder: true,
        lastSentDate: null,
        nextReminderDate: null
      },
      metadata: {
        createdBy: userId,
        version: 1
      }
    });

    const newEntry = await accountEntry.save();
    await newEntry.populate('masterTypeId');
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all master entries
router.get('/masters', async (req, res) => {
  try {
    const entries = await AccountEntry.find().populate('masterTypeId').sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get master entries by master type
router.get('/masters/type/:masterType', async (req, res) => {
  try {
    const masterType = req.params.masterType;
    const entries = await AccountEntry.find({ 
      masterTypeName: masterType 
    }).populate('masterTypeId').sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific master entry
router.get('/masters/:id', async (req, res) => {
  try {
    const entry = await AccountEntry.findById(req.params.id).populate('masterTypeId');
    if (!entry) return res.status(404).json({ message: 'Master entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a master entry
router.put('/masters/:id', async (req, res) => {
  try {
    const { defaultFields, customFields } = req.body;
    const userId = req.user.id; // Assuming you have auth middleware
    const now = new Date();

    // First get the existing entry
    const existingEntry = await AccountEntry.findById(req.params.id);
    if (!existingEntry) {
      return res.status(404).json({ message: 'Master entry not found' });
    }

    // Prepare the update object with proper timestamps
    const updateData = {
      defaultFields: {
        companyName: {
          value: defaultFields.companyName,
          lastUpdated: existingEntry.defaultFields.companyName.value !== defaultFields.companyName ? now : existingEntry.defaultFields.companyName.lastUpdated
        },
        address: {
          value: defaultFields.address,
          lastUpdated: existingEntry.defaultFields.address.value !== defaultFields.address ? now : existingEntry.defaultFields.address.lastUpdated
        },
        billingDate: {
          value: defaultFields.billingDate,
          lastUpdated: existingEntry.defaultFields.billingDate.value !== defaultFields.billingDate ? now : existingEntry.defaultFields.billingDate.lastUpdated
        },
        dueDate: {
          value: defaultFields.dueDate,
          lastUpdated: existingEntry.defaultFields.dueDate.value !== defaultFields.dueDate ? now : existingEntry.defaultFields.dueDate.lastUpdated
        },
        reminder: {
          frequency: defaultFields.reminder.frequency || existingEntry.defaultFields.reminder.frequency,
          lastSent: existingEntry.defaultFields.reminder.lastSent,
          nextReminder: existingEntry.defaultFields.reminder.nextReminder
        }
      },
      customFields: customFields.map(cf => {
        const existingField = existingEntry.customFields.find(ecf => ecf.name === cf.name);
        return {
          name: cf.name,
          value: cf.value,
          type: cf.type,
          lastUpdated: existingField && existingField.value !== cf.value ? now : (existingField ? existingField.lastUpdated : now)
        };
      }),
      'metadata.updatedBy': userId,
      'metadata.version': existingEntry.metadata.version + 1,
      'metadata.lastActivity': now,
      updatedAt: now
    };

    // Add timeline entry for the update
    existingEntry.addTimeline('updated', userId, {
      changes: {
        defaultFields: Object.keys(defaultFields).filter(key => 
          JSON.stringify(defaultFields[key]) !== JSON.stringify(existingEntry.defaultFields[key].value)
        ),
        customFields: customFields.filter(cf => {
          const existingField = existingEntry.customFields.find(ecf => ecf.name === cf.name);
          return !existingField || JSON.stringify(cf.value) !== JSON.stringify(existingField.value);
        }).map(cf => cf.name)
      }
    });

    // Perform the update
    const entry = await AccountEntry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('masterTypeId');
    
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a master entry
router.delete('/masters/:id', async (req, res) => {
  try {
    const entry = await AccountEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Master entry not found' });
    res.json({ message: 'Master entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADDITIONAL UTILITY ROUTES
// Get master type structure by name (for form building)
router.get('/master-types/by-name/:name', async (req, res) => {
  try {
    const masterType = await MasterType.findOne({ 
      name: req.params.name, 
      isActive: true 
    });
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json(masterType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search masters by company name
router.get('/masters/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const entries = await AccountEntry.find({
      'defaultFields.companyName': { $regex: query, $options: 'i' }
    }).populate('masterTypeId').sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
