import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Stack,
  Alert,
  Paper,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  SelectChangeEvent
} from '@mui/material';

// Define interfaces for our types
interface CustomField {
  name: string;
  value: any;
  type: string;
}

interface MasterType {
  _id: string;
  name: string;
  customFields: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
}

interface DefaultFields {
  companyName: string;
  address: string;
  billingDate: Date | null;
  dueDate: Date | null;
  reminder: {
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  };
}

interface FormData {
  masterType: string;
  defaultFields: DefaultFields;
  customFields: CustomField[];
}

interface AccountEntryFormProps {
  initialData?: {
    masterTypeName: string;
    defaultFields: {
      companyName: { value: string };
      address: { value: string };
      billingDate: { value: Date | null };
      dueDate: { value: Date | null };
      reminder: {
        frequency: 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
      };
    };
    customFields: CustomField[];
  };
  onSubmit: (data: FormData) => Promise<void>;
  masterTypes: MasterType[];
}
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  AccessTime as AccessTimeIcon,
  BusinessCenter as BusinessCenterIcon,
  DateRange as DateRangeIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { useNotification } from '../../contexts/NotificationContext';

const AccountEntryForm: React.FC<AccountEntryFormProps> = ({ initialData, onSubmit, masterTypes }) => {
  const { addNotification } = useNotification();
  const [formData, setFormData] = useState<FormData>({
    masterType: '',
    defaultFields: {
      companyName: '',
      address: '',
      billingDate: null,
      dueDate: null,
      reminder: {
        frequency: 'monthly'
      }
    },
    customFields: []
  });
  const [selectedMasterType, setSelectedMasterType] = useState<MasterType | null>(null);
  
  interface FormErrors {
    [key: string]: string;
  }
  
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        masterType: initialData.masterTypeName,
        defaultFields: {
          companyName: initialData.defaultFields.companyName.value,
          address: initialData.defaultFields.address.value,
          billingDate: initialData.defaultFields.billingDate.value,
          dueDate: initialData.defaultFields.dueDate.value,
          reminder: {
            frequency: initialData.defaultFields.reminder.frequency
          }
        },
        customFields: initialData.customFields.map(cf => ({
          name: cf.name,
          value: cf.value,
          type: cf.type
        }))
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (formData.masterType) {
      const masterType = masterTypes.find(mt => mt.name === formData.masterType);
      setSelectedMasterType(masterType);
    }
  }, [formData.masterType, masterTypes]);

  const handleMasterTypeChange = (event: SelectChangeEvent<string>) => {
    const masterType = masterTypes.find(mt => mt.name === event.target.value);
    setFormData(prev => ({
      ...prev,
      masterType: event.target.value,
      customFields: masterType?.customFields.map(field => ({
        name: field.name,
        value: '',
        type: field.type
      })) || []
    }));
  };

  const handleDefaultFieldChange = (field: keyof DefaultFields, value: any) => {
    setFormData(prev => ({
      ...prev,
      defaultFields: {
        ...prev.defaultFields,
        [field]: value
      }
    }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCustomFieldChange = (index: number, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.map((field, i) => 
        i === index ? { ...field, value } : field
      )
    }));
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    // Validate required fields
    if (!formData.defaultFields.companyName) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.defaultFields.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    
    // Validate custom fields
    formData.customFields.forEach((field, index) => {
      const masterField = selectedMasterType?.customFields.find(f => f.name === field.name);
      if (masterField?.required && !field.value) {
        newErrors[`custom_${index}`] = `${field.name} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      addNotification({
        type: 'error',
        message: 'Please fill in all required fields',
        title: 'Validation Error'
      });
      return;
    }

    try {
      await onSubmit(formData);
      addNotification({
        type: 'success',
        message: initialData ? 'Entry updated successfully' : 'Entry created successfully',
        title: 'Success'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message,
        title: 'Error'
      });
    }
  };

  const reminderOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'half-yearly', label: 'Half Yearly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={0} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Master Type Selection */}
            <FormControl fullWidth>
              <InputLabel>Master Type</InputLabel>
              <Select
                value={formData.masterType}
                onChange={handleMasterTypeChange}
                label="Master Type"
                disabled={!!initialData}
              >
                {masterTypes.map(type => (
                  <MenuItem key={type._id} value={type.name}>
                    {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Default Fields */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Company Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={formData.defaultFields.companyName}
                      onChange={(e) => handleDefaultFieldChange('companyName', e.target.value)}
                      error={!!errors.companyName}
                      helperText={errors.companyName}
                      required
                      InputProps={{
                        startAdornment: (
                          <BusinessCenterIcon color="action" sx={{ mr: 1 }} />
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={formData.defaultFields.address}
                      onChange={(e) => handleDefaultFieldChange('address', e.target.value)}
                      multiline
                      rows={2}
                      InputProps={{
                        startAdornment: (
                          <LocationOnIcon color="action" sx={{ mr: 1 }} />
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Billing Date"
                      value={formData.defaultFields.billingDate}
                      onChange={(date) => handleDefaultFieldChange('billingDate', date)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth
                          error={!!errors.billingDate}
                          helperText={errors.billingDate}
                          InputProps={{
                            startAdornment: (
                              <AccessTimeIcon color="action" sx={{ mr: 1 }} />
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Due Date"
                      value={formData.defaultFields.dueDate}
                      onChange={(date) => handleDefaultFieldChange('dueDate', date)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth
                          required
                          error={!!errors.dueDate}
                          helperText={errors.dueDate}
                          InputProps={{
                            startAdornment: (
                              <DateRangeIcon color="action" sx={{ mr: 1 }} />
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Reminder Frequency</InputLabel>
                      <Select
                        value={formData.defaultFields.reminder.frequency}
                        onChange={(e) => handleDefaultFieldChange('reminder', { frequency: e.target.value })}
                        label="Reminder Frequency"
                      >
                        {reminderOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Custom Fields */}
            {selectedMasterType && formData.customFields.length > 0 && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Additional Information
                  </Typography>
                  <Grid container spacing={3}>
                    {formData.customFields.map((field, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        {field.type === 'text' && (
                          <TextField
                            fullWidth
                            label={field.name}
                            value={field.value}
                            onChange={(e) => handleCustomFieldChange(index, e.target.value)}
                            error={!!errors[`custom_${index}`]}
                            helperText={errors[`custom_${index}`]}
                            required={selectedMasterType.customFields[index].required}
                          />
                        )}
                        {field.type === 'number' && (
                          <TextField
                            fullWidth
                            type="number"
                            label={field.name}
                            value={field.value}
                            onChange={(e) => handleCustomFieldChange(index, e.target.value)}
                            error={!!errors[`custom_${index}`]}
                            helperText={errors[`custom_${index}`]}
                            required={selectedMasterType.customFields[index].required}
                          />
                        )}
                        {field.type === 'date' && (
                          <DatePicker
                            label={field.name}
                            value={field.value}
                            onChange={(date) => handleCustomFieldChange(index, date)}
                            renderInput={(params) => (
                              <TextField 
                                {...params} 
                                fullWidth
                                error={!!errors[`custom_${index}`]}
                                helperText={errors[`custom_${index}`]}
                                required={selectedMasterType.customFields[index].required}
                              />
                            )}
                          />
                        )}
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={() => setFormData({
                  masterType: '',
                  defaultFields: {
                    companyName: '',
                    address: '',
                    billingDate: null,
                    dueDate: null,
                    reminder: { frequency: 'monthly' }
                  },
                  customFields: []
                })}
              >
                Clear
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
              >
                {initialData ? 'Update Entry' : 'Create Entry'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </LocalizationProvider>
  );
};

export default AccountEntryForm;
