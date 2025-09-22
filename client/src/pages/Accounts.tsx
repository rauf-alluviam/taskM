import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import AccountsComponent from '../components/accounts/MasterTypeManager';

const Accounts: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', background: '#f7fafd' }}>
  <Box sx={{ mb: 2 }}>
    <Typography variant="h4" fontWeight={700} color="#222">
      Master Management
    </Typography>
    <Typography variant="subtitle1" color="#697386">
      Manage your business records with advanced tracking
    </Typography>
  </Box>
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 3,
          borderRadius: 3,
          border: '1px solid #e3e8f0',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(23,101,216,0.05)',
          maxWidth: 1600,
        }}
      >
        <AccountsComponent />
      </Paper>
    </Box>
  );
};


export default Accounts;
