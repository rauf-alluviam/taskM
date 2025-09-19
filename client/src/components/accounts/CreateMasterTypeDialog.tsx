import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid as Grid,
  FormHelperText,
  Divider,
  SelectChangeEvent,
  Chip,
  Paper,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Info as InfoIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'upload' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
}

interface DefaultFields {
  companyName: boolean;
  address: boolean;
  billingDate: boolean;
  dueDate: boolean;
  reminder: 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
}

interface MasterTypeFormData {
  name: string;
  description: string;
  defaultFields: DefaultFields;
  customFields: CustomField[];
}

interface CreateMasterTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FieldType {
  value: CustomField['type'];
  label: string;
  description: string;
}

interface ReminderOption {
  value: DefaultFields['reminder'];
  label: string;
}

const FIELD_TYPES: FieldType[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input with validation' },
  { value: 'date', label: 'Date', description: 'Date picker input' },
  { value: 'email', label: 'Email', description: 'Email address with validation' },
  { value: 'phone', label: 'Phone', description: 'Phone number input' },
  { value: 'upload', label: 'File Upload', description: 'File attachment field' },
  { value: 'select', label: 'Dropdown', description: 'Predefined options list' },
  { value: 'boolean', label: 'Yes/No', description: 'Toggle or checkbox input' }
];

const REMINDER_OPTIONS: ReminderOption[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' }
];

export const CreateMasterTypeDialog: React.FC<CreateMasterTypeDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<MasterTypeFormData>({
    name: '',
    description: '',
    defaultFields: {
      companyName: true,
      address: true,
      billingDate: true,
      dueDate: true,
      reminder: 'monthly'
    },
    customFields: []
  });

  const generateFieldId = (): string => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Master type name is required';
    }

    // Validate custom fields
    formData.customFields.forEach((field, index) => {
      if (!field.name.trim()) {
        newErrors[`customField_${index}_name`] = 'Field name is required';
      }
      
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        newErrors[`customField_${index}_options`] = 'Select fields must have at least one option';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCustomField = (): void => {
    const newField: CustomField = {
      id: generateFieldId(),
      name: '',
      type: 'text',
      required: false,
      placeholder: ''
    };

    setFormData(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField]
    }));
  };

  const handleRemoveCustomField = (index: number): void => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));

    // Clear any errors for the removed field
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`customField_${index}_`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const handleCustomFieldChange = (index: number, field: Partial<CustomField>): void => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.map((item, i) =>
        i === index ? { ...item, ...field } : item
      )
    }));

    // Clear related errors when field is updated
    if (field.name && errors[`customField_${index}_name`]) {
      const newErrors = { ...errors };
      delete newErrors[`customField_${index}_name`];
      setErrors(newErrors);
    }
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData(prev => ({ ...prev, name: event.target.value }));
    if (errors.name && event.target.value.trim()) {
      const newErrors = { ...errors };
      delete newErrors.name;
      setErrors(newErrors);
    }
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData(prev => ({ ...prev, description: event.target.value }));
  };

  const handleReminderChange = (event: SelectChangeEvent<string>): void => {
    setFormData(prev => ({
      ...prev,
      defaultFields: {
        ...prev.defaultFields,
        reminder: event.target.value as DefaultFields['reminder']
      }
    }));
  };

  const handleDefaultFieldToggle = (fieldName: keyof Omit<DefaultFields, 'reminder'>) => (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setFormData(prev => ({
      ...prev,
      defaultFields: {
        ...prev.defaultFields,
        [fieldName]: event.target.checked
      }
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      addNotification({
        type: 'error',
        message: 'Please fix the validation errors before submitting.',
        title: 'Validation Error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Simulate API call - replace with actual API endpoint
      const response = await fetch(`${(import.meta as any).env.VITE_APP_URL}/accounts/master-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create master type');
      }

      addNotification({
        type: 'success',
        message: `Master type "${formData.name}" created successfully`,
        title: 'Success'
      });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        defaultFields: {
          companyName: true,
          address: true,
          billingDate: true,
          dueDate: true,
          reminder: 'monthly'
        },
        customFields: []
      });
      setErrors({});
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating master type:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create master type',
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (): void => {
    if (!loading) {
      setFormData({
        name: '',
        description: '',
        defaultFields: {
          companyName: true,
          address: true,
          billingDate: true,
          dueDate: true,
          reminder: 'monthly'
        },
        customFields: []
      });
      setErrors({});
      onClose();
    }
  };

  const getFieldTypeIcon = (type: CustomField['type']): string => {
    const icons: Record<CustomField['type'], string> = {
      text: '📝',
      number: '🔢',
      date: '📅',
      email: '📧',
      phone: '📞',
      upload: '📎',
      select: '📋',
      boolean: '✅'
    };
    return icons[type] || '📝';
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
            Create New Master Type
          </Typography>
          <Chip 
            icon={<InfoIcon />} 
            label="Template Builder" 
            color="primary" 
            variant="outlined" 
          />
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Create a custom master type with predefined and custom fields for your accounts
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 0 }}>
        <Box sx={{ pt: 2 }}>
          {/* Basic Information */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Master Type Name"
                  required
                  fullWidth
                  value={formData.name}
                  onChange={handleNameChange}
                  error={!!errors.name}
                  helperText={errors.name}
                  placeholder="e.g., Customer Accounts, Vendor Accounts"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Description"
                  fullWidth
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  placeholder="Brief description of this master type"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Default Fields */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Default Fields
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Configure which standard fields should be included
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.defaultFields.companyName}
                        onChange={handleDefaultFieldToggle('companyName')}
                        disabled // Always required
                      />
                    }
                    label="Company Name (Always Required)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.defaultFields.address}
                        onChange={handleDefaultFieldToggle('address')}
                      />
                    }
                    label="Address"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.defaultFields.billingDate}
                        onChange={handleDefaultFieldToggle('billingDate')}
                      />
                    }
                    label="Billing Date"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.defaultFields.dueDate}
                        onChange={handleDefaultFieldToggle('dueDate')}
                      />
                    }
                    label="Due Date"
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Default Reminder Frequency</InputLabel>
                  <Select
                    value={formData.defaultFields.reminder}
                    onChange={handleReminderChange}
                    label="Default Reminder Frequency"
                  >
                    {REMINDER_OPTIONS.map((option: ReminderOption) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    How often reminders will be sent for accounts of this type
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Custom Fields */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6">
                  Custom Fields ({formData.customFields.length})
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Add specific fields for this master type
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCustomField}
                size="small"
              >
                Add Field
              </Button>
            </Box>

            {formData.customFields.length === 0 ? (
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  py: 4, 
                  color: 'text.secondary',
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  border: '2px dashed',
                  borderColor: 'grey.300'
                }}
              >
                <Typography variant="body1">
                  No custom fields added yet
                </Typography>
                <Typography variant="body2">
                  Click "Add Field" to create custom fields for this master type
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {formData.customFields.map((field: CustomField, index: number) => (
                  <Paper 
                    key={field.id} 
                    variant="outlined" 
                    sx={{ p: 2, bgcolor: 'grey.50' }}
                  >
                    <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          label="Field Name"
                          required
                          fullWidth
                          size="small"
                          value={field.name}
                          onChange={(e) => handleCustomFieldChange(index, { name: e.target.value })}
                          error={!!errors[`customField_${index}_name`]}
                          helperText={errors[`customField_${index}_name`]}
                          placeholder="Enter field name"
                        />
                      </Grid>
                      
                      <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Field Type</InputLabel>
                          <Select
                            value={field.type}
                            onChange={(e) => handleCustomFieldChange(index, {
                              type: e.target.value as CustomField['type']
                            })}
                            label="Field Type"
                          >
                            {FIELD_TYPES.map((type: FieldType) => (
                              <MenuItem key={type.value} value={type.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span>{getFieldTypeIcon(type.value)}</span>
                                  {type.label}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Required</InputLabel>
                          <Select
                            value={field.required ? 'required' : 'optional'}
                            onChange={(e) => handleCustomFieldChange(index, {
                              required: e.target.value === 'required'
                            })}
                            label="Required"
                          >
                            <MenuItem value="required">Required</MenuItem>
                            <MenuItem value="optional">Optional</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                          label="Placeholder"
                          fullWidth
                          size="small"
                          value={field.placeholder || ''}
                          onChange={(e) => handleCustomFieldChange(index, { placeholder: e.target.value })}
                          placeholder="Hint text"
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <IconButton 
                            onClick={() => handleRemoveCustomField(index)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Grid>

                      {field.type === 'select' && (
                        <Grid size={12}>
                          <TextField
                            label="Options (comma separated)"
                            fullWidth
                            size="small"
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => handleCustomFieldChange(index, {
                              options: e.target.value.split(',').map(opt => opt.trim()).filter(Boolean)
                            })}
                            error={!!errors[`customField_${index}_options`]}
                            helperText={errors[`customField_${index}_options`] || 'Enter options separated by commas'}
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.name.trim()}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Creating...' : 'Create Master Type'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};