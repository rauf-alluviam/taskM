import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Typography,
  Tooltip,
  Stack,
  Card,
  CardContent,
  //Grid,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  BusinessCenter as BusinessCenterIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import{ Grid } from '@mui/material';
const AccountEntriesList = ({ entries, onEdit, onView, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const getStatusColor = (entry) => {
    const status = entry.status.current;
    switch (status) {
      case 'completed':
        return 'success';
      case 'overdue':
        return 'error';
      case 'due_soon':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (entry) => {
    const status = entry.status.current;
    switch (status) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'overdue':
        return <WarningIcon fontSize="small" />;
      case 'due_soon':
        return <AccessTimeIcon fontSize="small" />;
      default:
        return <BusinessCenterIcon fontSize="small" />;
    }
  };

  const filteredEntries = entries.filter(entry => 
    entry.defaultFields.companyName.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.masterTypeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary statistics
  const stats = {
    total: filteredEntries.length,
    overdue: filteredEntries.filter(e => e.status.current === 'overdue').length,
    dueSoon: filteredEntries.filter(e => e.status.current === 'due_soon').length,
    completed: filteredEntries.filter(e => e.status.current === 'completed').length
  };

  return (
    <Stack spacing={3}>
      {/* Statistics Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Entries
              </Typography>
              <Typography variant="h4">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="error" gutterBottom>
                Overdue
              </Typography>
              <Typography variant="h4" color="error">
                {stats.overdue}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="warning.main" gutterBottom>
                Due Soon
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.dueSoon}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="success.main" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by company name or type..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Entries Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Billing Date</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.map((entry) => (
              <TableRow 
                key={entry._id}
                hover
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  bgcolor: entry.status.current === 'overdue' ? 'error.lighter' : 'inherit'
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {entry.defaultFields.companyName.value}
                  </Typography>
                  {entry.defaultFields.address.value && (
                    <Typography variant="caption" color="textSecondary">
                      {entry.defaultFields.address.value}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={entry.masterTypeName}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(entry)}
                    label={entry.status.current.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(entry)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color={entry.status.current === 'overdue' ? 'error.main' : 'textPrimary'}
                  >
                    {format(new Date(entry.defaultFields.dueDate.value), 'dd MMM yyyy')}
                  </Typography>
                </TableCell>
                <TableCell>
                  {entry.defaultFields.billingDate.value ? (
                    <Typography variant="body2">
                      {format(new Date(entry.defaultFields.billingDate.value), 'dd MMM yyyy')}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Not Set
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {format(new Date(entry.updatedAt), 'dd MMM yyyy HH:mm')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => onView(entry)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Entry">
                      <IconButton size="small" onClick={() => onEdit(entry)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Entry">
                      <IconButton 
                        size="small" 
                        onClick={() => onDelete(entry)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default AccountEntriesList;
