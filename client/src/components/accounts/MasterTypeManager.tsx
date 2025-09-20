// components/MasterTypeManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Avatar,
  Tooltip,
  Fade,
  Slide,
  useTheme,
  alpha
} from '@mui/material';
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
  CalendarToday
} from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { CustomField, DefaultFields, MasterType, MasterEntry, MasterData } from './master.types';


const API_BASE_URL = import.meta.env.VITE_APP_URL;

interface ReminderOption {
  value: DefaultFields['reminder'];
  label: string;
}

const MasterTypeManager: React.FC = () => {
  const theme = useTheme();
  const [masterTypes, setMasterTypes] = useState<MasterType[]>([]);
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
    <Box sx={{ 
      p: { xs: 1, sm: 2, md: 3 }, 
      maxWidth: 1600, 
      mx: 'auto',
      bgcolor: alpha(theme.palette.primary.main, 0.02),
      minHeight: '100vh'
    }}>
      {/* Enhanced Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mb: 4,
        position: 'relative'
      }}>
        <Box sx={{ 
          width: 56, 
          height: 56, 
          borderRadius: '16px', 
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
        }}>
          <Business sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 800, 
              color: theme.palette.text.primary,
              letterSpacing: '-0.025em',
              fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem' },
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Master Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            Manage your business records with advanced tracking
          </Typography>
        </Box>
      </Box>

      {/* Enhanced Master Type Selection */}
      <Fade in timeout={600}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 4,
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
            backdropFilter: 'blur(10px)'
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel 
                  sx={{ 
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: theme.palette.primary.main
                  }}
                >
                  Select Master Type
                </InputLabel>
                <Select
                  value={selectedMasterType}
                  label="Select Master Type"
                  onChange={handleMasterTypeChange}
                  sx={{
                    borderRadius: 3,
                    '& .MuiOutlinedInput-root': {
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      }
                    }
                  }}
                >
                  {getMasterTypeOptions().map((type) => (
                    <MenuItem key={type} value={type} sx={{ fontSize: '1rem', py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.primary.main }}>
                          <Business sx={{ fontSize: 14 }} />
                        </Avatar>
                        {type}
                      </Box>
                    </MenuItem>
                  ))}
                  <MenuItem value="CREATE_NEW" sx={{ fontSize: '1rem', color: theme.palette.success.main, py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.success.main }}>
                        <Add sx={{ fontSize: 14 }} />
                      </Avatar>
                      Create New Master Type
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {selectedMasterType && selectedMasterType !== 'CREATE_NEW' && (
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {(() => {
                    const stats = getMasterTypeStats(selectedMasterType);
                    return (
                      <>
                        <Chip
                          icon={<TrendingUp />}
                          label={`${stats.total} Total`}
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                        <Chip
                          icon={<Schedule />}
                          label={`${stats.upcoming} Due Soon`}
                          color="warning"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                        <Chip
                          icon={<ErrorIcon />}
                          label={`${stats.overdue} Overdue`}
                          color="error"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </>
                    );
                  })()}
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Fade>

      <Grid container spacing={3}>
        {/* Enhanced Inline Form */}
        {showInlineForm && selectedMasterType !== 'CREATE_NEW' && (
          <Grid item xs={12} lg={5}>
            <Slide direction="right" in mountOnEnter unmountOnExit>
              <Card 
                elevation={0}
                sx={{ 
                  borderRadius: 4,
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                  position: 'sticky',
                  top: 20,
                  backdropFilter: 'blur(10px)'
                }}
              >
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: editMode ? theme.palette.warning.main : theme.palette.primary.main,
                            width: 32,
                            height: 32
                          }}
                        >
                          {editMode ? <Edit fontSize="small" /> : <PersonAdd fontSize="small" />}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                          {editMode ? 'Edit Entry' : 'Add New Entry'}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={clearInlineForm}
                        sx={{ 
                          color: theme.palette.text.secondary,
                          '&:hover': { 
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            color: theme.palette.error.main
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
                          color: theme.palette.primary.main,
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
                                borderColor: theme.palette.primary.main,
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
                            color: theme.palette.secondary.main,
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
                            fontWeight: 600
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
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                            borderRadius: 3
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
                                    borderRadius: 2
                                  }
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
                                      borderRadius: 2
                                    }
                                  }}
                                />
                              ) : field.type === 'upload' ? (
                                <Box>
                                  <Button
                                    variant="outlined"
                                    startIcon={<CloudUpload />}
                                    size="small"
                                    sx={{ 
                                      borderRadius: 2,
                                      textTransform: 'none',
                                      fontWeight: 600
                                    }}
                                  >
                                    Upload Files
                                  </Button>
                                  {Array.isArray(field.value) && field.value.length > 0 && (
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                      {field.value.length} file(s) selected
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
                                      borderRadius: 2
                                    }
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
                                    borderRadius: 2
                                  }}
                                >
                                  <MenuItem value="text">Text</MenuItem>
                                  <MenuItem value="number">Number</MenuItem>
                                  <MenuItem value="date">Date</MenuItem>
                                  <MenuItem value="email">Email</MenuItem>
                                  <MenuItem value="phone">Phone</MenuItem>
                                  <MenuItem value="upload">Upload</MenuItem>
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
                                      bgcolor: alpha(theme.palette.error.main, 0.1)
                                    },
                                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                                    borderRadius: 2
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
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                          '&:hover': {
                            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
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
                          px: 3
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
              elevation={0} 
              sx={{ 
                borderRadius: 4,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                overflow: 'hidden',
                background: theme.palette.background.paper
              }}
            >
              <Box sx={{ 
                p: 3, 
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.text.primary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Assignment color="primary" />
                    {selectedMasterType} Records
                    <Chip 
                      label={filteredEntries.length} 
                      color="primary" 
                      size="small" 
                      sx={{ fontWeight: 600 }}
                    />
                  </Typography>
                </Box>
              </Box>

              {filteredEntries.length === 0 ? (
                <Box sx={{ p: 8, textAlign: 'center' }}>
                  <Avatar
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <Business sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: theme.palette.text.primary }}>
                    No entries found
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 4, fontSize: '1.1rem' }}>
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
                        py: 1.5
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
                        <TableCell sx={{ 
                          fontWeight: 700, 
                          bgcolor: alpha(theme.palette.primary.main, 0.04), 
                          color: theme.palette.text.primary,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                          py: 2
                        }}>
                          Company
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 700, 
                          bgcolor: alpha(theme.palette.primary.main, 0.04), 
                          color: theme.palette.text.primary,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`
                        }}>
                          Location
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 700, 
                          bgcolor: alpha(theme.palette.primary.main, 0.04), 
                          color: theme.palette.text.primary,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`
                        }}>
                          Due Date
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 700, 
                          bgcolor: alpha(theme.palette.primary.main, 0.04), 
                          color: theme.palette.text.primary,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`
                        }}>
                          Status
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 700, 
                          bgcolor: alpha(theme.palette.primary.main, 0.04), 
                          color: theme.palette.text.primary,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                          width: 140
                        }}>
                          Actions
                        </TableCell>
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
                              '&:hover': { 
                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                                transform: 'translateY(-1px)',
                                transition: 'all 0.2s ease-in-out'
                              },
                              cursor: 'pointer',
                              bgcolor: editMode && masterData.id === entry._id 
                                ? alpha(theme.palette.warning.main, 0.1) 
                                : 'inherit'
                            }}
                          >
                            <TableCell sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar 
                                  sx={{ 
                                    width: 40, 
                                    height: 40,
                                    bgcolor: theme.palette.primary.main,
                                    fontSize: '0.875rem',
                                    fontWeight: 700
                                  }}
                                >
                                  {getCompanyInitials(entry.defaultFields.companyName)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                    {entry.defaultFields.companyName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    Entry #{index + 1}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ 
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: 500
                                }}
                              >
                                {entry.defaultFields.address || 'Not provided'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarToday sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
                                    '& .MuiChip-icon': { fontSize: 14 }
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
                                      bgcolor: alpha(theme.palette.info.main, 0.1),
                                      color: theme.palette.info.main,
                                      '&:hover': { 
                                        bgcolor: alpha(theme.palette.info.main, 0.2),
                                        transform: 'scale(1.1)'
                                      },
                                      borderRadius: 2
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
                                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                                      color: theme.palette.warning.main,
                                      '&:hover': { 
                                        bgcolor: alpha(theme.palette.warning.main, 0.2),
                                        transform: 'scale(1.1)'
                                      },
                                      borderRadius: 2
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
                  color: theme.palette.text.primary, 
                  mb: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Assignment sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
                Your Master Types
              </Typography>
              
              {masterTypes.length === 0 ? (
                <Card 
                  elevation={0} 
                  sx={{ 
                    p: 8, 
                    textAlign: 'center',
                    borderRadius: 4,
                    border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`
                  }}
                >
                  <Avatar
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <Business sx={{ fontSize: 48, color: theme.palette.primary.main }} />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: theme.palette.text.primary }}>
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
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
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
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                            '&:hover': {
                              transform: 'translateY(-8px)',
                              boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
                              borderColor: theme.palette.primary.main
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
                                  bgcolor: theme.palette.primary.main,
                                  mr: 2
                                }}
                              >
                                <Business sx={{ fontSize: 24 }} />
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '1.1rem' }}>
                                  {masterType.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                                  {masterType.fields?.length || 0} custom fields
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                                    {stats.total}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                                    Total
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.warning.main }}>
                                    {stats.upcoming}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                                    Due Soon
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.error.main }}>
                                    {stats.overdue}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
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
                                  color: theme.palette.primary.main, 
                                  borderColor: theme.palette.primary.main,
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
                        border: `2px dashed ${alpha(theme.palette.success.main, 0.3)}`,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.02)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                        '&:hover': {
                          borderColor: theme.palette.success.main,
                          bgcolor: alpha(theme.palette.success.main, 0.04),
                          transform: 'translateY(-4px)'
                        }
                      }}
                      onClick={() => {
                        resetForm();
                        setOpenDialog(true);
                      }}
                    >
                      <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <Avatar
                          sx={{ 
                            width: 64, 
                            height: 64,
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
                            mb: 2,
                            mx: 'auto'
                          }}
                        >
                          <Add sx={{ fontSize: 32, color: theme.palette.success.main }} />
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 1 }}>
                          Create New Master
                        </Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem', mb: 3 }}>
                          Set up a new master type with custom fields for your business needs
                        </Typography>
                        <Chip
                          label="+ New Master Type"
                          sx={{ 
                            bgcolor: theme.palette.success.main, 
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        />
                      </CardContent>
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
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`
          } 
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          color: theme.palette.text.primary,
          fontWeight: 700,
          fontSize: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32 }}>
            <Add fontSize="small" />
          </Avatar>
          Create New Master Type
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Master Type Name"
              value={masterData.masterType}
              onChange={(e) => setMasterData(prev => ({ ...prev, masterType: e.target.value }))}
              required
              placeholder="e.g., GST Returns, Income Tax, Compliance"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                  }
                }
              }}
            />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 2 }}>
                Company Information Fields
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={masterData.defaultFields.companyName}
                    onChange={(e) => handleDefaultFieldChange('companyName', e.target.value)}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={masterData.defaultFields.address}
                    onChange={(e) => handleDefaultFieldChange('address', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Reminder</InputLabel>
                    <Select
                      value={masterData.defaultFields.reminder}
                      label="Reminder"
                      onChange={(e) => handleDefaultFieldChange('reminder', e.target.value as DefaultFields['reminder'])}
                      sx={{
                        borderRadius: 3
                      }}
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
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                  Additional Custom Fields
                </Typography>
                <Button 
                  startIcon={<Add />} 
                  onClick={addCustomField}
                  variant="outlined"
                  sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
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
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                    borderRadius: 3
                  }}
                >
                  <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Field Name"
                        size="small"
                        value={field.name}
                        onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={field.type === 'upload' ? 6 : 3}>
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
                              borderRadius: 2
                            }
                          }}
                        />
                      ) : field.type === 'upload' ? (
                        <Box>
                          <Button
                            variant="outlined"
                            startIcon={<CloudUpload />}
                            size="small"
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600
                            }}
                          >
                            Upload Files
                          </Button>
                          {Array.isArray(field.value) && field.value.length > 0 && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {field.value.length} file(s) selected
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
                              borderRadius: 2
                            }
                          }}
                        />
                      )}
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
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
                            borderRadius: 2
                          }}
                        >
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="date">Date</MenuItem>
                          <MenuItem value="email">Email</MenuItem>
                          <MenuItem value="phone">Phone</MenuItem>
                          <MenuItem value="upload">Upload</MenuItem>
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
                            '&:hover': { 
                              bgcolor: alpha(theme.palette.error.main, 0.1)
                            },
                            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                            borderRadius: 2
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

        <DialogActions sx={{ 
          p: 3, 
          background: alpha(theme.palette.primary.main, 0.04), 
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}` 
        }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            sx={{ textTransform: 'none', color: theme.palette.text.secondary, fontWeight: 600 }}
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
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
              }
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
        maxWidth="sm" 
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 4,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`
          } 
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          color: theme.palette.text.primary,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ bgcolor: theme.palette.info.main, width: 32, height: 32 }}>
            <Visibility fontSize="small" />
          </Avatar>
          {selectedEntry?.defaultFields.companyName}
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          {selectedEntry && (
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Type
                </Typography>
                <Chip 
                  label={selectedEntry.masterTypeName} 
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Address
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedEntry.defaultFields.address || 'Not provided'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Billing Date
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formatDate(selectedEntry.defaultFields.billingDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Due Date
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formatDate(selectedEntry.defaultFields.dueDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Reminder
                </Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                  {selectedEntry.defaultFields.reminder}
                </Typography>
              </Grid>

              {selectedEntry.customFields && selectedEntry.customFields.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 2 }}>
                      Additional Information
                    </Typography>
                  </Grid>
                  {selectedEntry.customFields.map((field, index) => (
                    <Grid item xs={6} key={index}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {field.name}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {Array.isArray(field.value) ? `${field.value.length} files` : field.value || 'Not provided'}
                      </Typography>
                    </Grid>
                  ))}
                </>
              )}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          background: alpha(theme.palette.primary.main, 0.04), 
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}` 
        }}>
          <Button 
            onClick={() => setViewDialog(false)}
            sx={{ textTransform: 'none', color: theme.palette.text.secondary, fontWeight: 600 }}
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
              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.secondary.main} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
              }
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
