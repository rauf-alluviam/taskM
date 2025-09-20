import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import AccountsComponent from '../components/accounts/MasterTypeManager';

const Accounts: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Account Management
      </Typography>
      <Paper sx={{ mt: 3 }}>
        <AccountsComponent />
      </Paper>
    </Box>
  );
};

export default Accounts;
