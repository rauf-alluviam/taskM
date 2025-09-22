// components/MasterTypeManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Paper,
  Grid,

  Typography,
  Avatar,
  Button,
  Divider,
  Fade,
  Stack,
  CardHeader,
  Tooltip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Slide
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Visibility,
  Business,
  Clear,
  Assignment,
  TrendingUp,
  Schedule,
  PersonAdd,
  CloudUpload,
  CheckCircle,
  Warning,
  Error as ErrorIcon,

  Extension,          // For "Additional Information" section
          // For "Basic Information" section  
  LocationOn,         // For address display
  CalendarToday,      // For "Important Dates" section and billing date
  Event,              // For due date
  NotificationsActive, // For reminder
  AttachFile,         // For file attachments
  Close,              // For close button in header
              
} from '@mui/icons-material';

import { SelectChangeEvent } from '@mui/material/Select';
import { CustomField, DefaultFields, MasterType, MasterEntry, MasterData } from './master.types';
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";

const API_BASE_URL = import.meta.env.VITE_APP_URL;

interface ReminderOption {
  value: DefaultFields['reminder'];
  label: string;
}

const MasterTypeManager: React.FC = () => {
  const theme = useTheme();
  const [masterTypes, setMasterTypes] = useState<MasterType[]>([]);
  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([]);

  const [masterEntries, setMasterEntries] = useState<MasterEntry[]>([]);
  const [selectedMasterType, setSelectedMasterType] = useState<string>('');
  const [filteredEntries, setFilteredEntries] = useState<MasterEntry[]>([]);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [viewDialog, setViewDialog] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<MasterEntry | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [showInlineForm, setShowInlineForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [masterData, setMasterData] = useState<MasterData>({
    id: null,
    masterType: '',
    defaultFields: {
      companyName: '',
      address: '',
      billingDate: '',
      dueDate: '',
      reminder: 'monthly'
    },
    customFields: []
  });

  const PRIMARY_COLOR = "#2186eb";
const SECONDARY_COLOR = "#3ed6cb";
const SIDEBAR_BG = "#f6f9fd";
const HEADER_GRADIENT = "linear-gradient(90deg, #2186eb 0%, #3ed6cb 100%)";
const CARD_BG = "#fff";
const ICON_BG = "#eaf3fb";
// Called when files are uploaded successfully to backend
const handleFilesUploaded = (fieldId: string | number, files: { url: string; key: string }[]) => {
  setMasterData(prev => {
    const updatedFields = prev.customFields.map(cf => {
      if (cf.id === fieldId) {
        const existingValues = Array.isArray(cf.value) ? cf.value : [];
        const newUrls = files.map(f => f.url);
        return { ...cf, value: [...existingValues, ...newUrls] };
      }
      return cf;
    });
    return { ...prev, customFields: updatedFields };
  });
};

// Delete single uploaded file by URL
const handleDeleteUploadFile = async (fieldId: string | number, fileUrl: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl }),
    });
    if (!response.ok) throw new Error('Failed to delete file from server');

    setMasterData(prev => {
      const updatedFields = prev.customFields.map(cf => {
        if (cf.id === fieldId && Array.isArray(cf.value)) {
          return { ...cf, value: cf.value.filter((v: string) => v !== fileUrl) };
        }
        return cf;
      });
      return { ...prev, customFields: updatedFields };
    });
  } catch (error) {
    console.error(error);
  }
};



  const reminderOptions: ReminderOption[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'half-yearly', label: 'Half Yearly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  useEffect(() => {
    fetchMasterTypes();
    fetchMasterEntries();
  }, []);

  useEffect(() => {
    if (selectedMasterType && masterEntries.length > 0) {
      const filtered = masterEntries.filter(entry => 
        entry.masterTypeName === selectedMasterType
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries([]);
    }
  }, [selectedMasterType, masterEntries]);

  const fetchMasterTypes = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/accounts/master-types`);
      if (!response.ok) throw new Error('Failed to fetch master types');
      const data: MasterType[] = await response.json();
      setMasterTypes(data);
    } catch (error) {
      console.error('Error fetching master types:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterEntries = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/masters`);
      if (!response.ok) throw new Error('Failed to fetch master entries');
      const data: MasterEntry[] = await response.json();
      setMasterEntries(data);
    } catch (error) {
      console.error('Error fetching master entries:', error);
    }
  };

  const getMasterTypeStats = useCallback((masterTypeName: string) => {
    const entries = masterEntries.filter(entry => entry.masterTypeName === masterTypeName);
    const total = entries.length;
    const overdue = entries.filter(entry => {
      if (!entry.defaultFields.dueDate) return false;
      const today = new Date();
      const due = new Date(entry.defaultFields.dueDate);
      return due < today;
    }).length;
    const upcoming = entries.filter(entry => {
      if (!entry.defaultFields.dueDate) return false;
      const today = new Date();
      const due = new Date(entry.defaultFields.dueDate);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length;
    
    return { total, overdue, upcoming };
  }, [masterEntries]);

  const handleMasterTypeChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    setSelectedMasterType(value);
    
    if (value === 'CREATE_NEW') {
      resetForm();
      setShowInlineForm(false);
      setOpenDialog(true);
    } else if (value) {
      const existingMaster = masterTypes.find(mt => mt.name === value);
      if (existingMaster) {
        setMasterData(prev => ({
          ...prev,
          id: null,
          masterType: value,
          defaultFields: {
            companyName: '',
            address: '',
            billingDate: '',
            dueDate: '',
            reminder: 'monthly'
          },
          customFields: existingMaster.fields.map(field => ({
            id: Date.now() + Math.random(),
            name: field.name,
            value: '',
            type: field.type as CustomField['type'],
            required: field.required
          })) || []
        }));
      } else {
        resetFormForExisting(value);
      }
      setShowInlineForm(true);
      setEditMode(false);
    } else {
      setShowInlineForm(false);
    }
  };

  const handleMasterTypeCardClick = (masterTypeName: string): void => {
    setSelectedMasterType(masterTypeName);
    const existingMaster = masterTypes.find(mt => mt.name === masterTypeName);
    if (existingMaster) {
      setMasterData(prev => ({
        ...prev,
        id: null,
        masterType: masterTypeName,
        defaultFields: {
          companyName: '',
          address: '',
          billingDate: '',
          dueDate: '',
          reminder: 'monthly'
        },
        customFields: existingMaster.fields.map(field => ({
          id: Date.now() + Math.random(),
          name: field.name,
          value: '',
          type: field.type as CustomField['type'],
          required: field.required
        })) || []
      }));
    }
    setShowInlineForm(true);
    setEditMode(false);
  };

  const resetForm = (): void => {
    setMasterData({
      id: null,
      masterType: '',
      defaultFields: {
        companyName: '',
        address: '',
        billingDate: '',
        dueDate: '',
        reminder: 'monthly'
      },
      customFields: []
    });
    setEditMode(false);
  };

  const resetFormForExisting = (masterType: string): void => {
    setMasterData({
      id: null,
      masterType: masterType,
      defaultFields: {
        companyName: '',
        address: '',
        billingDate: '',
        dueDate: '',
        reminder: 'monthly'
      },
      customFields: []
    });
    setEditMode(false);
  };

  const clearInlineForm = (): void => {
    if (selectedMasterType && selectedMasterType !== 'CREATE_NEW') {
      const existingMaster = masterTypes.find(mt => mt.name === selectedMasterType);
      setMasterData(prev => ({
        ...prev,
        id: null,
        defaultFields: {
          companyName: '',
          address: '',
          billingDate: '',
          dueDate: '',
          reminder: 'monthly'
        },
        customFields: existingMaster ? existingMaster.fields.map(field => ({
          id: Date.now() + Math.random(),
          name: field.name,
          value: '',
          type: field.type as CustomField['type'],
          required: field.required
        })) : []
      }));
    }
    setEditMode(false);
  };

  const addCustomField = (): void => {
    setMasterData(prev => ({
      ...prev,
      customFields: [...prev.customFields, {
        id: Date.now(),
        name: '',
        value: '',
        type: 'text',
        required: false
      }]
    }));
  };

  const updateCustomField = (id: string | number, field: keyof CustomField, value: string | boolean | string[]): void => {
    setMasterData(prev => ({
      ...prev,
      customFields: prev.customFields.map(cf => 
        cf.id === id ? { ...cf, [field]: value } : cf
      )
    }));
  };

  const removeCustomField = (id: string | number): void => {
    setMasterData(prev => ({
      ...prev,
      customFields: prev.customFields.filter(cf => cf.id !== id)
    }));
  };

  const handleDefaultFieldChange = (field: keyof DefaultFields, value: string): void => {
    setMasterData(prev => ({
      ...prev,
      defaultFields: {
        ...prev.defaultFields,
        [field]: value
      }
    }));
  };

  const handleEdit = (entry: MasterEntry): void => {
    setEditMode(true);
    setMasterData({
      id: entry._id,
      masterType: entry.masterTypeName,
      defaultFields: { ...entry.defaultFields },
      customFields: entry.customFields.map(cf => ({
        ...cf,
        id: cf.id || Date.now() + Math.random()
      })) || []
    });
    setShowInlineForm(true);
  };

  const handleInlineSubmit = async (): Promise<void> => {
    try {
      setLoading(true);
      const masterEntry = {
        masterType: selectedMasterType,
        defaultFields: masterData.defaultFields,
        customFields: masterData.customFields
      };

      const url = editMode 
        ? `${API_BASE_URL}/accounts/masters/${masterData.id}`
        : `${API_BASE_URL}/accounts/masters`;
      
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterEntry)
      });

      if (response.ok) {
        clearInlineForm();
        await fetchMasterEntries();
      }
    } catch (error) {
      console.error('Error saving master:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setLoading(true);
      const masterTypeStructure = {
        name: masterData.masterType,
        fields: masterData.customFields.map(cf => ({
          name: cf.name,
          type: cf.type,
          required: cf.required || false
        }))
      };

      await fetch(`${API_BASE_URL}/accounts/master-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterTypeStructure)
      });

      const masterEntry = {
        masterType: masterData.masterType,
        defaultFields: masterData.defaultFields,
        customFields: masterData.customFields
      };

      const response = await fetch(`${API_BASE_URL}/accounts/masters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterEntry)
      });

      if (response.ok) {
        setOpenDialog(false);
        setSelectedMasterType(masterData.masterType);
        await fetchMasterTypes();
        await fetchMasterEntries();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving master:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMasterTypeOptions = (): string[] => {
    const customTypes = masterTypes.map(mt => mt.name);
    return [...new Set([...customTypes])];
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilDue = (dueDate: string): number | null => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (daysUntilDue: number | null): 'default' | 'error' | 'warning' | 'success' => {
    if (daysUntilDue === null) return 'default';
    if (daysUntilDue < 0) return 'error';
    if (daysUntilDue <= 7) return 'warning';
    return 'success';
  };

  const getStatusIcon = (daysUntilDue: number | null) => {
    if (daysUntilDue === null) return <CheckCircle />;
    if (daysUntilDue < 0) return <ErrorIcon />;
    if (daysUntilDue <= 7) return <Warning />;
    return <CheckCircle />;
  };

  const handleViewEntry = (entry: MasterEntry): void => {
    setSelectedEntry(entry);
    setViewDialog(true);
  };

  const getCompanyInitials = (companyName: string): string => {
    return companyName
      ?.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || '??';
  };

return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: '#f7fafd', minHeight: '100vh' }}>
      {/* Header with Back Button and Master Type Selection */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          border: `1px solid ${alpha('#dbeafe', 0.8)}`,
          background: '#f0f4ff',
          boxShadow: 'none',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          {selectedMasterType && selectedMasterType !== 'CREATE_NEW' && (
            <Grid item xs={12} md={1}>
              <IconButton 
                onClick={() => {
                  setSelectedMasterType('');
                  setShowInlineForm(false);
                }}
                sx={{
                  bgcolor: '#3b82f6',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#2563eb',
                  }
                }}
              >
                <Clear />
              </IconButton>
            </Grid>
          )}
          
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 280 }} size="small">
            <InputLabel sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
              Select Master Type
            </InputLabel>
            <Select
              value={selectedMasterType}
              label="Select Master Type"
              onChange={handleMasterTypeChange}
              sx={{
                borderRadius: 2,
                backgroundColor: '#fff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
              }}
            >
              {getMasterTypeOptions().map((type) => (
                <MenuItem key={type} value={type}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: '#3b82f6' }}>
                      <Business sx={{ fontSize: 14 }} />
                    </Avatar>
                    {type}
                  </Box>
                </MenuItem>
              ))}
              <MenuItem value="CREATE_NEW">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: '#10b981' }}>
                    <Add sx={{ fontSize: 14 }} />
                  </Avatar>
                  Create New Type
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {selectedMasterType && selectedMasterType !== 'CREATE_NEW' && (
            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
              {(() => {
                const stats = getMasterTypeStats(selectedMasterType);
                return (
                  <>
                    <Chip 
                      label={`${stats.total} Total`} 
                      size="small" 
                      color="primary" 
                      sx={{ fontSize: '0.75rem' }} 
                    />
                    <Chip 
                      label={`${stats.upcoming} Due`} 
                      size="small" 
                      color="warning" 
                      sx={{ fontSize: '0.75rem' }} 
                    />
                    <Chip 
                      label={`${stats.overdue} Overdue`} 
                      size="small" 
                      color="error" 
                      sx={{ fontSize: '0.75rem' }} 
                    />
                  </>
                );
              })()}
            </Box>
          )}
          </Box>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Enhanced Inline Form */}
        {showInlineForm && selectedMasterType !== 'CREATE_NEW' && (
          <Grid item xs={12} lg={5}>
            <Slide direction="right" in mountOnEnter unmountOnExit>
              <Card 
                elevation={0}
                sx={{ 
                  borderRadius: 2,
                  border: `1px solid ${alpha('#3b82f6', 0.15)}`,
                  background: '#fff',
                  position: 'sticky',
                  top: 20,
                  boxShadow: `0 4px 16px ${alpha('#3b82f6', 0.08)}`
                }}
              >
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: editMode ? '#f59e0b' : '#3b82f6',
                            width: 32,
                            height: 32
                          }}
                        >
                          {editMode ? <Edit fontSize="small" /> : <PersonAdd fontSize="small" />}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                          {editMode ? 'Edit Entry' : 'Add New Entry'}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={clearInlineForm}
                        sx={{ 
                          color: '#6b7280',
                          '&:hover': { 
                            bgcolor: alpha('#ef4444', 0.1),
                            color: '#ef4444'
                          }
                        }}
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                  sx={{ pb: 1 }}
                />
                <CardContent sx={{ pt: 0 }}>
                  <Stack spacing={3}>
                    {/* Company Information Section */}
                    <Box>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          mb: 2, 
                          fontWeight: 700, 
                          color: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <Business fontSize="small" />
                        Company Information
                      </Typography>
                      <Stack spacing={2.5}>
                        <TextField
                          fullWidth
                          label="Company Name"
                          value={masterData.defaultFields.companyName}
                          onChange={(e) => handleDefaultFieldChange('companyName', e.target.value)}
                          required
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 3,
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#3b82f6',
                              }
                            }
                          }}
                        />
                        <TextField
                          fullWidth
                          label="Address"
                          value={masterData.defaultFields.address}
                          onChange={(e) => handleDefaultFieldChange('address', e.target.value)}
                          multiline
                          rows={3}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 3
                            }
                          }}
                        />
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Billing Date"
                              type="date"
                              value={masterData.defaultFields.billingDate}
                              onChange={(e) => handleDefaultFieldChange('billingDate', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 3
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Due Date"
                              type="date"
                              value={masterData.defaultFields.dueDate}
                              onChange={(e) => handleDefaultFieldChange('dueDate', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 3
                                }
                              }}
                            />
                          </Grid>
                        </Grid>
                        <FormControl fullWidth>
                          <InputLabel>Reminder Frequency</InputLabel>
                          <Select
                            value={masterData.defaultFields.reminder}
                            label="Reminder Frequency"
                            onChange={(e) => handleDefaultFieldChange('reminder', e.target.value as DefaultFields['reminder'])}
                            sx={{
                              borderRadius: 3
                            }}
                          >
                            {reminderOptions.map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Schedule fontSize="small" color="primary" />
                                  {option.label}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                    </Box>

                    {/* Custom Fields Section */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 700, 
                            color: '#14b8a6',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Assignment fontSize="small" />
                          Custom Fields
                        </Typography>
                        <Button 
                          startIcon={<Add />} 
                          onClick={addCustomField}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            borderRadius: 3, 
                            textTransform: 'none',
                            fontWeight: 600,
                            borderColor: '#14b8a6',
                            color: '#14b8a6'
                          }}
                        >
                          Add Field
                        </Button>
                      </Box>
                      
                      {masterData.customFields.map((field) => (
                        <Paper
                          key={field.id}
                          elevation={0}
                          sx={{
                            p: 2.5,
                            mb: 2,
                            bgcolor: alpha('#3b82f6', 0.04),
                            border: `1px solid ${alpha('#3b82f6', 0.12)}`,
                            borderRadius: 3,
                          }}
                        >
                          <Grid container spacing={2} alignItems="flex-start">
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                label="Field Name"
                                size="small"
                                value={field.name}
                                onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                  },
                                }}
                              />
                            </Grid>

                            <Grid item xs={12} sm={field.type === 'upload' ? 4 : 3}>
                              {field.type === 'date' ? (
                                <TextField
                                  fullWidth
                                  label="Default Value"
                                  size="small"
                                  type="date"
                                  value={typeof field.value === 'string' ? field.value : ''}
                                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: 2,
                                    },
                                  }}
                                />
                              ) : field.type === 'upload' ? (
                                null
                              ) : (
                                <TextField
                                  fullWidth
                                  label="Default Value"
                                  size="small"
                                  type={field.type}
                                  value={typeof field.value === 'string' ? field.value : ''}
                                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: 2,
                                    },
                                  }}
                                />
                              )}
                            </Grid>

                            <Grid item xs={6} sm={field.type === 'upload' ? 2 : 3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Type</InputLabel>
                                <Select
                                  value={field.type}
                                  label="Type"
                                  onChange={(e) => {
                                    const newType = e.target.value as CustomField['type'];
                                    updateCustomField(field.id, 'type', newType);
                                    updateCustomField(field.id, 'value', newType === 'upload' ? [] : '');
                                  }}
                                  sx={{
                                    borderRadius: 2,
                                  }}
                                >
                                  <MenuItem value="text">Text</MenuItem>
                                  <MenuItem value="number">Number</MenuItem>
                                  <MenuItem value="date">Date</MenuItem>
                                  <MenuItem value="email">Email</MenuItem>
                                  <MenuItem value="phone">Phone</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                            <Grid item xs={6} sm={field.type === 'upload' ? 2 : 2}>
                              <Tooltip title="Remove Field">
                                <IconButton
                                  color="error"
                                  onClick={() => removeCustomField(field.id)}
                                  size="small"
                                  sx={{
                                    '&:hover': {
                                      bgcolor: alpha('#ef4444', 0.1),
                                    },
                                    border: `1px solid ${alpha('#ef4444', 0.2)}`,
                                    borderRadius: 2,
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleInlineSubmit}
                        disabled={!masterData.defaultFields.companyName || loading}
                        sx={{
                          flex: 1,
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 700,
                          py: 1.5,
                          background: `linear-gradient(135deg, #3b82f6 0%, #14b8a6 100%)`,
                          '&:hover': {
                            background: `linear-gradient(135deg, #2563eb 0%, #0d9488 100%)`,
                          }
                        }}
                      >
                        {loading ? 'Saving...' : editMode ? 'Update Entry' : 'Save Entry'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={clearInlineForm}
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600,
                          py: 1.5,
                          px: 3,
                          borderColor: '#6b7280',
                          color: '#6b7280'
                        }}
                      >
                        Clear
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Slide>
          </Grid>
        )}

        {/* Enhanced Entries Table */}
        {selectedMasterType && selectedMasterType !== 'CREATE_NEW' && (
          <Grid item xs={12} lg={showInlineForm ? 7 : 12}>
            <Card
              elevation={1}
              sx={{
                borderRadius: 4,
                border: `1px solid ${alpha('#e5e7eb', 0.8)}`,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: 'none',
              }}
            >
              <Box
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #e0f0ff 100%)',
                  borderBottom: `1px solid ${alpha('#e5e7eb', 0.8)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Assignment color="primary" />
                  {selectedMasterType} Records
                  <Chip
                    label={filteredEntries.length}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600, ml: 1 }}
                  />
                </Typography>
              </Box>

              {filteredEntries.length === 0 ? (
                <Box sx={{ p: 8, textAlign: 'center', color: '#6b7280' }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: alpha('#3b82f6', 0.1),
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <Business sx={{ fontSize: 40, color: '#3b82f6' }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1f2937' }}>
                    No entries found
                  </Typography>
                  <Typography
                    color="textSecondary"
                    sx={{ mb: 4, fontSize: '1.1rem', maxWidth: 480, mx: 'auto' }}
                  >
                    Start by adding your first {selectedMasterType.toLowerCase()} entry
                  </Typography>
                  {!showInlineForm && (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setShowInlineForm(true)}
                      sx={{
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 4,
                        py: 1.5,
                        backgroundColor: '#3b82f6',
                        '&:hover': {
                          backgroundColor: '#2563eb',
                        },
                      }}
                    >
                      Add First Entry
                    </Button>
                  )}
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 700 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['Company', 'Location', 'Due Date', 'Status', 'Actions'].map((header, i) => (
                          <TableCell
                            key={header}
                            sx={{
                              fontWeight: 700,
                              backgroundColor: i === 0 ? '#f6f8fb' : 'transparent',
                              color: i === 0 ? '#3b82f6' : '#1f2937',
                              borderBottom: `2px solid ${alpha('#3b82f6', 0.15)}`,
                              py: 2,
                              width: header === 'Actions' ? 140 : 'auto',
                            }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEntries.map((entry, index) => {
                        const daysUntilDue = getDaysUntilDue(entry.defaultFields.dueDate);
                        const statusColor = getStatusColor(daysUntilDue);

                        return (
                          <TableRow
                            key={entry._id}
                            hover
                            sx={{
                              cursor: 'pointer',
                              backgroundColor:
                                editMode && masterData.id === entry._id
                                  ? alpha('#f59e0b', 0.15)
                                  : 'inherit',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                backgroundColor: alpha('#3b82f6', 0.1),
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 10px rgba(59, 130, 246, 0.1)',
                              },
                            }}
                          >
                            <TableCell sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: '#3b82f6',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                  }}
                                >
                                  {getCompanyInitials(entry.defaultFields.companyName)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1f2937' }}>
                                    {entry.defaultFields.companyName}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                    Entry #{index + 1}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: 500,
                                  color: '#6b7280',
                                }}
                              >
                                {entry.defaultFields.address || 'Not provided'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarToday sx={{ fontSize: 16, color: '#6b7280' }} />
                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                                  {formatDate(entry.defaultFields.dueDate)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {daysUntilDue !== null && (
                                <Chip
                                  size="small"
                                  icon={getStatusIcon(daysUntilDue)}
                                  label={
                                    daysUntilDue < 0
                                      ? `${Math.abs(daysUntilDue)}d overdue`
                                      : `${daysUntilDue}d left`
                                  }
                                  color={statusColor}
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    borderRadius: 2,
                                    '& .MuiChip-icon': { fontSize: 14 },
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewEntry(entry)}
                                    sx={{
                                      bgcolor: alpha('#3b82f6', 0.1),
                                      color: '#3b82f6',
                                      borderRadius: 2,
                                      '&:hover': {
                                        bgcolor: alpha('#3b82f6', 0.2),
                                        transform: 'scale(1.1)',
                                      },
                                    }}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Entry">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEdit(entry)}
                                    sx={{
                                      bgcolor: alpha('#f59e0b', 0.1),
                                      color: '#f59e0b',
                                      borderRadius: 2,
                                      '&:hover': {
                                        bgcolor: alpha('#f59e0b', 0.2),
                                        transform: 'scale(1.1)',
                                      },
                                    }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Grid>
        )}

        {/* Enhanced Master Type Cards */}
        {!selectedMasterType && (
          <Grid item xs={12}>
            <Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1f2937', 
                  mb: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Assignment sx={{ color: '#3b82f6', fontSize: 32 }} />
                Your Master Types
              </Typography>
              
              {masterTypes.length === 0 ? (
                <Card 
                  elevation={0} 
                  sx={{ 
                    p: 8, 
                    textAlign: 'center',
                    borderRadius: 4,
                    border: `2px dashed ${alpha('#3b82f6', 0.3)}`,
                    background: `linear-gradient(135deg, ${alpha('#fff', 0.8)} 0%, ${alpha('#3b82f6', 0.04)} 100%)`
                  }}
                >
                  <Avatar
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      bgcolor: alpha('#3b82f6', 0.1),
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <Business sx={{ fontSize: 48, color: '#3b82f6' }} />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1f2937' }}>
                    No master types created yet
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 4, fontSize: '1.1rem', maxWidth: 500, mx: 'auto' }}>
                    Create your first master type to start organizing and tracking your business records efficiently
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    onClick={() => {
                      resetForm();
                      setOpenDialog(true);
                    }}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      background: `linear-gradient(135deg, #3b82f6 0%, #14b8a6 100%)`,
                      '&:hover': {
                        background: `linear-gradient(135deg, #2563eb 0%, #0d9488 100%)`,
                      }
                    }}
                  >
                    Create Your First Master Type
                  </Button>
                </Card>
              ) : (
                <Grid container spacing={3}>
                  {masterTypes.map((masterType) => {
                    const stats = getMasterTypeStats(masterType.name);
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={masterType._id}>
                        <Card 
                          elevation={0}
                          sx={{ 
                            borderRadius: 4,
                            border: `1px solid ${alpha('#3b82f6', 0.12)}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: `linear-gradient(135deg, #fff 0%, ${alpha('#3b82f6', 0.02)} 100%)`,
                            '&:hover': {
                              transform: 'translateY(-8px)',
                              boxShadow: `0 20px 40px ${alpha('#3b82f6', 0.15)}`,
                              borderColor: '#3b82f6'
                            }
                          }}
                          onClick={() => handleMasterTypeCardClick(masterType.name)}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                              <Avatar 
                                sx={{ 
                                  width: 48, 
                                  height: 48,
                                  bgcolor: '#3b82f6',
                                  mr: 2
                                }}
                              >
                                <Business sx={{ fontSize: 24 }} />
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937', fontSize: '1.1rem' }}>
                                  {masterType.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                  {masterType.fields?.length || 0} custom fields
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#3b82f6' }}>
                                    {stats.total}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                                    Total
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#f59e0b' }}>
                                    {stats.upcoming}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                                    Due Soon
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#ef4444' }}>
                                    {stats.overdue}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                                    Overdue
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              <Chip
                                label="Click to manage"
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  color: '#3b82f6', 
                                  borderColor: '#3b82f6',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                  
                  {/* Create New Master Type Card */}
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 4,
                        border: `2px dashed ${alpha('#3b82f6', 0.3)}`,
                        cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.05)} 0%, ${alpha('#14b8a6', 0.10)} 100%)`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 4,
                        height: '100%',
                        "&:hover": {
                          borderColor: '#3b82f6',
                          bgcolor: alpha('#3b82f6', 0.12),
                          transform: "translateY(-6px)",
                          boxShadow: "0 8px 20px rgba(59, 130, 246, 0.3)",
                        },
                      }}
                      onClick={() => {
                        resetForm();
                        setOpenDialog(true);
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 72,
                          height: 72,
                          bgcolor: alpha('#14b8a6', 0.15),
                          border: `2px solid ${alpha('#3b82f6', 0.25)}`,
                          mb: 3,
                        }}
                      >
                        <Add sx={{ fontSize: 36, color: '#3b82f6' }} />
                      </Avatar>

                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#3b82f6',
                          mb: 1,
                          textAlign: "center",
                        }}
                      >
                        Create New Master
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color: '#4a5768',
                          fontSize: "0.9rem",
                          mb: 3,
                          maxWidth: 220,
                          textAlign: "center",
                        }}
                      >
                        Set up a new master type with custom fields for your business needs
                      </Typography>

                      <Chip
                        label="+ New Master Type"
                        sx={{
                          bgcolor: '#14b8a6',
                          color: '#fff',
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                        }}
                      />
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Enhanced Create Dialog */}
<Dialog
  open={openDialog}
  onClose={() => setOpenDialog(false)}
  maxWidth="md"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: 4,
      maxHeight: '90vh',
      backgroundColor: '#ffffff', // Set solid white background
      boxShadow: '0 12px 24px rgba(59, 130, 246, 0.1)', // softened shadow
      p: 0,
    },
  }}
>
  <DialogTitle
    sx={{
      backgroundColor: '#f0f4ff',
      borderBottom: '1px solid #93c5fd', // primary 300 from your palette
      color: '#2563eb', // primary 600
      fontWeight: 700,
      fontSize: '1.4rem',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      px: 5,
      py: 4,
      mb: 3,
      letterSpacing: '0.03em',
      userSelect: 'none',
    }}
  >
    <Avatar sx={{ bgcolor: '#2563eb', width: 36, height: 36 }}>
      <Add fontSize="small" />
    </Avatar>
    Create New Master Type
  </DialogTitle>

  <DialogContent
    sx={{
      pt: 6,
      pb: 4,
      px: 5,
      backgroundColor: '#ffffff', // solid white background here
      overflowY: 'auto',
      maxHeight: 'calc(90vh - 120px)',
    }}
  >
    <Stack spacing={3}>
      <TextField
        fullWidth
        label="Master Type Name"
        value={masterData.masterType}
        onChange={(e) => setMasterData((prev) => ({ ...prev, masterType: e.target.value }))}
        required
        placeholder="e.g., GST Returns, Income Tax, Compliance"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            backgroundColor: '#ffffff',
            border: '1.5px solid #e5e7eb',
            transition: 'border-color 0.3s ease',
            '&:hover': { borderColor: '#3b82f6', backgroundColor: '#f0f9ff' },
            '&.Mui-focused': {
              borderColor: '#3b82f6',
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 4px rgba(59,130,246,0.15)',
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 600,
            fontSize: '1rem',
            color: '#374151',
            '&.Mui-focused': { color: '#3b82f6' },
          },
        }}
      />

      <Box
        sx={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          p: 5,
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.03)',
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, color: '#1f2937', mb: 4, fontSize: '1.125rem', letterSpacing: '0.02em' }}
        >
          Company Information
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Company Name"
              value={masterData.defaultFields.companyName}
              onChange={(e) => handleDefaultFieldChange('companyName', e.target.value)}
              required
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.3s ease',
                  '&:hover': { borderColor: '#3b82f6' },
                  '&.Mui-focused': {
                    borderColor: '#3b82f6',
                    boxShadow: '0 0 0 4px rgba(59,130,246,0.25)',
                  },
                },
                '& .MuiInputLabel-root': { color: '#6b7280', fontWeight: 600, fontSize: '0.95rem' },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Address"
              value={masterData.defaultFields.address}
              onChange={(e) => handleDefaultFieldChange('address', e.target.value)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.3s ease',
                  '&:hover': { borderColor: '#6366f1' },
                  '&.Mui-focused': {
                    borderColor: '#6366f1',
                    boxShadow: '0 0 0 4px rgba(99,102,241,0.25)',
                  },
                },
                '& .MuiInputLabel-root': { color: '#6b7280', fontWeight: 600, fontSize: '0.95rem' },
              }}
            />
          </Grid>

          {[{ label: 'Billing Date', field: 'billingDate' }, { label: 'Due Date', field: 'dueDate' }].map(({ label, field }) => (
            <Grid item xs={12} md={4} key={field}>
              <TextField
                fullWidth
                type="date"
                label={label}
                value={masterData.defaultFields[field]}
                onChange={(e) => handleDefaultFieldChange(field as any, e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.3s ease',
                    '&:hover': { borderColor: '#6366f1' },
                    '&.Mui-focused': {
                      borderColor: '#6366f1',
                      boxShadow: '0 0 0 4px rgba(99,102,241,0.25)',
                    },
                  },
                  '& .MuiInputLabel-root': { color: '#6b7280', fontWeight: 600, fontSize: '0.95rem' },
                }}
              />
            </Grid>
          ))}

          <Grid item xs={12} md={4}>
            <FormControl
              fullWidth
              size="small"
              sx={{
                borderRadius: 3,
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1', boxShadow: '0 0 0 4px rgba(99,102,241,0.25)' },
              }}
            >
              <InputLabel sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.95rem' }}>Reminder</InputLabel>
              <Select
                value={masterData.defaultFields.reminder}
                label="Reminder"
                onChange={(e) => handleDefaultFieldChange('reminder', e.target.value)}
                sx={{ borderRadius: 3, backgroundColor: '#ffffff' }}
              >
                {reminderOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          p: 4,
          mt: 4,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1f2937', fontSize: '1.05rem' }}>
            Custom Fields
          </Typography>
          <Button
            startIcon={<Add />}
            onClick={addCustomField}
            variant="contained"
            size="small"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#6366f1',
              fontSize: '0.9rem',
              px: 3,
              py: 1,
              minHeight: 'auto',
              transition: 'background-color 0.3s ease',
              '&:hover': { backgroundColor: '#4f46e5' },
            }}
          >
            Add Field
          </Button>
        </Box>

        {masterData.customFields.map((field, index) => (
          <Paper
            key={field.id}
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 3,
              transition: 'all 0.15s ease',
              '&:hover': { borderColor: '#d1d5db', backgroundColor: '#f3f4f6' },
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Field Name"
                  size="small"
                  value={field.name}
                  onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1d5db',
                      transition: 'border-color 0.3s ease',
                      '&:hover': { borderColor: '#6366f1' },
                      '&.Mui-focused': {
                        borderColor: '#6366f1',
                        boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
                      },
                    },
                    '& .MuiInputLabel-root': { color: '#6b7280', fontSize: '0.9rem' },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={field.type === 'upload' ? 5 : 3}>
                {field.type === 'date' ? (
                  <TextField
                    fullWidth
                    label="Default Value"
                    size="small"
                    type="date"
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        transition: 'border-color 0.3s ease',
                        '&:hover': { borderColor: '#6366f1' },
                        '&.Mui-focused': {
                          borderColor: '#6366f1',
                          boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
                        },
                      },
                      '& .MuiInputLabel-root': { color: '#6b7280', fontSize: '0.9rem' },
                    }}
                  />
                ) : field.type === 'upload' ? (
                  <Box>
                    <label htmlFor={`upload-button-${field.id}`} style={{ display: 'inline-block' }}>
                      <input
                        id={`upload-button-${field.id}`}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          if (!e.target.files) return;
                          const files = Array.from(e.target.files);
                          const token = localStorage.getItem('token');

                          const uploadedFiles = [];
                          for (const file of files) {
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const response = await fetch(`${API_BASE_URL}/files/upload`, {
                                method: 'POST',
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                                body: formData,
                              });
                              if (response.ok) {
                                const data = await response.json();
                                uploadedFiles.push({ url: data.url, key: data.filename });
                              }
                            } catch (err) {
                              console.error('Upload error:', err);
                            }
                          }
                          if (uploadedFiles.length > 0) {
                            handleFilesUploaded(field.id, uploadedFiles);
                          }
                          e.target.value = '';
                        }}
                      />
                      <Button
                        component="span"
                        variant="outlined"
                        startIcon={<CloudUpload />}
                        size="small"
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: '#d1d5db',
                          color: '#6b7280',
                          fontSize: '0.9rem',
                          '&:hover': {
                            borderColor: '#6366f1',
                            color: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.04)',
                          },
                        }}
                      >
                        Upload Files
                      </Button>
                    </label>
                    {Array.isArray(field.value) && field.value.length > 0 && (
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: '#6b7280' }}>
                        {field.value.length} file{field.value.length > 1 ? 's' : ''} selected
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    label="Default Value"
                    size="small"
                    type={field.type}
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        transition: 'border-color 0.3s ease',
                        '&:hover': {
                          borderColor: '#6366f1',
                        },
                        '&.Mui-focused': {
                          borderColor: '#6366f1',
                          boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#6b7280',
                        fontSize: '0.9rem',
                      },
                    }}
                  />
                )}
              </Grid>

              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#6b7280', fontSize: '0.9rem' }}>Type</InputLabel>
                  <Select
                    value={field.type}
                    label="Type"
                    onChange={(e) => {
                      const newType = e.target.value;
                      updateCustomField(field.id, 'type', newType);
                      updateCustomField(field.id, 'value', newType === 'upload' ? [] : '');
                    }}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1d5db',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#6366f1',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#6366f1',
                        boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
                      },
                    }}
                  >
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="phone">Phone</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} md={1}>
                <Tooltip title="Remove Field">
                  <IconButton
                    color="error"
                    onClick={() => removeCustomField(field.id)}
                    size="small"
                    sx={{
                      color: '#9ca3af',
                      border: '1px solid #e5e7eb',
                      borderRadius: 2,
                      '&:hover': {
                        color: '#ef4444',
                        borderColor: '#fecaca',
                        backgroundColor: '#fef2f2',
                      },
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Box>
    </Stack>
</DialogContent>

  <DialogActions
    sx={{
      p: 3,
      backgroundColor: '#ffffff', // solid white background
      borderTop: '1px solid #e0e7ff', // lighter primary 200-ish
      justifyContent: 'flex-end',
      gap: 2,
    }}
  >
    <Button
      onClick={() => setOpenDialog(false)}
      sx={{
        textTransform: 'none',
        color: '#64748b', // gray-500
        fontWeight: 600,
        fontSize: '1rem',
        px: 3,
        py: 1.5,
        borderRadius: 2,
        transition: 'background-color 0.3s ease',
        '&:hover': {
          backgroundColor: 'rgba(100, 116, 139, 0.1)', // subtle hover
        },
      }}
    >
      Cancel
    </Button>

    <Button
      onClick={handleSubmit}
      variant="contained"
      disabled={!masterData.masterType || !masterData.defaultFields.companyName || loading}
      sx={{
        textTransform: 'none',
        fontWeight: 700,
        borderRadius: 3,
        px: 4,
        // background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
        // '&:hover': {
        //   background: 'linear-gradient(90deg, #2563eb 0%, #2563eb 100%)',
        // },
        boxShadow: '0 4px 10px rgba(59,130,246,0.4)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {loading ? 'Creating...' : 'Create Master Type'}
    </Button>
  </DialogActions>
</Dialog>



      {/* Enhanced View Dialog */}
     <Dialog 
  open={viewDialog} 
  onClose={() => setViewDialog(false)} 
  maxWidth="md" 
  fullWidth
  PaperProps={{ 
    sx: { 
      borderRadius: 5,
      background: 'linear-gradient(135deg, #fafbfc 0%, #f8fafd 50%, #f5f7fa 100%)',
      boxShadow: '0 20px 60px rgba(23, 101, 216, 0.15)',
      border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
      overflow: 'hidden',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #1565C0 0%, #26A69A 50%, #FF7043 100%)',
      }
    } 
  }}
>
  <DialogTitle sx={{ 
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 253, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    color: theme.palette.text.primary,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    py: 3,
    px: 4,
    position: 'relative'
  }}>
    <Avatar sx={{ 
      background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
      width: 40, 
      height: 40,
      boxShadow: '0 4px 12px rgba(21, 101, 192, 0.25)'
    }}>
      <Visibility fontSize="medium" />
    </Avatar>
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
        {selectedEntry?.defaultFields.companyName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
        Master Entry Details
      </Typography>
    </Box>
    <IconButton
      onClick={() => setViewDialog(false)}
      sx={{
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        color: theme.palette.text.secondary,
        '&:hover': {
          background: alpha(theme.palette.error.main, 0.08),
          color: theme.palette.error.main,
        }
      }}
    >
      <close />
    </IconButton>
  </DialogTitle>
   
  <DialogContent sx={{ 
    pt: 4, 
    pb: 3,
    px: 4,
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)'
  }}>
    {selectedEntry && (
      <Grid container spacing={4}>
        {/* Basic Information Card */}
        <Grid item xs={12}>
          <Paper sx={{
            p: 3,
            borderRadius: 4,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 253, 0.7) 100%)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
            boxShadow: '0 2px 12px rgba(23, 101, 216, 0.06)'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              color: theme.palette.primary.main, 
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Business fontSize="small" />
              Basic Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(21, 101, 192, 0.12)'
                  }
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: 0.5
                  }}>
                    Master Type
                  </Typography>
                  <Chip 
                    label={selectedEntry.masterTypeName} 
                    sx={{
                      background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
                      color: 'white',
                      fontWeight: 700,
                      borderRadius: 3,
                      height: 32
                    }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #F3E5F5 0%, #FCE4EC 100%)',
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(156, 39, 176, 0.12)'
                  }
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: 0.5
                  }}>
                    Address
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
           
                    {selectedEntry.defaultFields.address || 'Not provided'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Date Information Card */}
        <Grid item xs={12}>
          <Paper sx={{
            p: 3,
            borderRadius: 4,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 248, 225, 0.7) 100%)',
            border: `1px solid ${alpha(theme.palette.warning.main, 0.08)}`,
            boxShadow: '0 2px 12px rgba(255, 152, 0, 0.06)'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              color: theme.palette.warning.main, 
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CalendarToday fontSize="small" />
              Important Dates
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)',
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(255, 152, 0, 0.15)'
                  }
                }}>
                  <CalendarToday color="warning" sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem'
                  }}>
                    Billing Date
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: theme.palette.warning.dark }}>
                    {formatDate(selectedEntry.defaultFields.billingDate)}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(244, 67, 54, 0.15)'
                  }
                }}>
                  <Event color="error" sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem'
                  }}>
                    Due Date
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: theme.palette.error.dark }}>
                    {formatDate(selectedEntry.defaultFields.dueDate)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)',
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(76, 175, 80, 0.15)'
                  }
                }}>
                 
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem'
                  }}>
                    Reminder
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    textTransform: 'capitalize', 
                    fontWeight: 700,
                    color: theme.palette.success.dark
                  }}>
                    {selectedEntry.defaultFields.reminder}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Custom Fields Card */}
        {selectedEntry.customFields && selectedEntry.customFields.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{
              p: 3,
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.7) 100%)',
              border: `1px solid ${alpha(theme.palette.info.main, 0.08)}`,
              boxShadow: '0 2px 12px rgba(33, 150, 243, 0.06)'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                color: theme.palette.info.main, 
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Extension fontSize="small" />
                Additional Information
              </Typography>
              <Grid container spacing={2}>
                {selectedEntry.customFields.map((field, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box sx={{
                      p: 2.5,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #E1F5FE 0%, #F3E5F5 100%)',
                      border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 16px rgba(33, 150, 243, 0.12)'
                      }
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        fontWeight: 700, 
                        mb: 1,
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        letterSpacing: 0.5
                      }}>
                        {field.name}
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        wordBreak: 'break-word'
                      }}>
                        {Array.isArray(field.value) 
                          ? (
                            <Chip 
                              label={`${field.value.length} files`}
                              icon={<AttachFile />}
                              size="small"
                              color="info"
                              sx={{ fontWeight: 600 }}
                            />
                          ) 
                          : field.value || (
                            <Typography component="span" sx={{ 
                              color: 'text.disabled', 
                              fontStyle: 'italic' 
                            }}>
                              Not provided
                            </Typography>
                          )
                        }
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    )}
  </DialogContent>

  <DialogActions sx={{ 
    p: 4, 
    background: 'linear-gradient(135deg, rgba(248, 250, 253, 0.8) 0%, rgba(240, 248, 255, 0.6) 100%)',
    backdropFilter: 'blur(10px)',
    borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    gap: 2
  }}>
    <Button 
      onClick={() => setViewDialog(false)}
      sx={{ 
        textTransform: 'none', 
        color: theme.palette.text.secondary, 
        fontWeight: 600,
        borderRadius: 3,
        px: 3,
        py: 1.2,
        '&:hover': {
          background: alpha(theme.palette.text.secondary, 0.08)
        }
      }}
    >
      Close
    </Button>
    <Button 
      variant="contained" 
      startIcon={<Edit />}
      onClick={() => {
        setViewDialog(false);
        if (selectedEntry) handleEdit(selectedEntry);
      }}
      sx={{
        textTransform: 'none',
        fontWeight: 700,
        borderRadius: 3,
        px: 4,
        py: 1.2,
        background: 'linear-gradient(135deg, #FF7043 0%, #FF5722 50%, #E91E63 100%)',
        boxShadow: '0 4px 16px rgba(255, 112, 67, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, #F4511E 0%, #D32F2F 50%, #C2185B 100%)',
          boxShadow: '0 6px 20px rgba(255, 112, 67, 0.4)',
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.2s ease'
      }}
    >
      Edit Entry
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
};

export default MasterTypeManager;
