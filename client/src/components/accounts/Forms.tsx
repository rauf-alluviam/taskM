import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  //Grid as Grid,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { CreateMasterTypeDialog } from './CreateMasterTypeDialog';

import Grid from '@mui/material/Grid';


interface CustomField {
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'upload' | 'select' | 'boolean';
  required: boolean;
}

interface MasterType {
  _id: string;
  name: string;
  defaultFields: {
    companyName: boolean;
    address: boolean;
    billingDate: boolean;
    dueDate: boolean;
    reminder: 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  };
  customFields: CustomField[];
  entries?: any[];
}

export const Forms: React.FC = () => {
  const [masterTypes, setMasterTypes] = useState<MasterType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [createMasterTypeOpen, setCreateMasterTypeOpen] = useState(false);
  const { addNotification } = useNotification();



  const fetchMasterTypes = async (): Promise<void> => {
    try {
      const response = await fetch(`${(import.meta as any).env.VITE_APP_URL}/accounts/master-types`);
      if (!response.ok) {
        throw new Error('Failed to fetch master types');
      }
      const data = await response.json();
      setMasterTypes(data);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to fetch master types',
        title: ''
      });
    }
  };
  useEffect(() => {
    fetchMasterTypes();
  }, []);
  const handleCreateMasterType = () => {
    setCreateMasterTypeOpen(true);
  };

  const handleMasterTypeCreated = () => {
    fetchMasterTypes();
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
     
          <Typography variant="h6"> Master Types</Typography>
          <Button
            variant="contained"
            onClick={handleCreateMasterType}
            startIcon={<AddIcon />}
          >
            Create Master Type
          </Button>
       

        <Grid container spacing={3}>
          {masterTypes.map((type) => (
            <Grid item xs={12} md={4} key={type._id}>
              <Card>
                <CardHeader
                  title={type.name}
                  subheader={`${type.entries?.length || 0} entries`}
                  action={
                    <IconButton onClick={() => setSelectedType(type._id)}>
                      <MoreVertIcon />
                    </IconButton>
                  }
                />
                <Divider />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Default Fields:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    {type.fields?.map((field) => (
                      <Chip key={field.name} label={field.name} size="small" />
                    ))}
                  </Box>
                  
                  {type.customFields?.length > 0 && (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Custom Fields:
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {type.customFields.map((field, index) => (
                          <Chip
                            key={index}
                            label={`${field.name} (${field.type}${field.required ? ' *' : ''})`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Reminder: {type.defaultFields.reminder}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {masterTypes.length === 0 && (
            <Grid item xs={12}>
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No master types found. Create your first master type to get started.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      <CreateMasterTypeDialog
        open={createMasterTypeOpen}
        onClose={() => setCreateMasterTypeOpen(false)}
        onSuccess={handleMasterTypeCreated}
      />
    </Box>
  );
};
