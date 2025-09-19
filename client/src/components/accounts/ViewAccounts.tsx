import React, { useState, useEffect, ReactNode, Key } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Stack,
  Grid as Grid,
  SelectChangeEvent,
  Button,
  Tooltip
} from '@mui/material';
import AccountHistoryDialog from './AccountHistoryDialog';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  AccountCircle as AccountCircleIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarTodayIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';

interface HistoryItem {
  action: 'created' | 'updated' | 'billing_date_set' | 'reminder_sent';
  details: any;
  createdAt: string;
}

interface AccountEntry {
  type: string;
  name: any;
  code: any;
  status: string;
  balance: number;
  id: Key | null | undefined;
  transactions: ReactNode;
  _id: string;
  masterTypeId: string;
  masterTypeName: string;
  defaultFields: {
    companyName: string;
    address?: string;
    billingDate?: string;
    dueDate?: string;
    reminder: 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  };
  customFields: Array<{
    name: string;
    value: any;
    type: string;
  }>;
  history?: HistoryItem[];
  createdAt: string;
  updatedAt: string;
}

interface AccountType {
  value: string;
  label: string;
}

type ChipColor = 'success' | 'error' | 'default' | 'primary' | 'secondary' | 'info' | 'warning';

const ViewAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<AccountEntry | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [entryHistory, setEntryHistory] = useState<HistoryItem[]>([]);
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [searchTerm, selectedType, accounts]);

  const fetchEntryHistory = async (entryId: string) => {
    try {
      const response = await fetch(`${(import.meta as any).env.VITE_APP_URL}/accounts/${entryId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setEntryHistory(data.history);
      setHistoryDialogOpen(true);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to fetch entry history',
        title: ''
      });
    }
  };

  const fetchAccounts = async (): Promise<void> => {
    try {
      const response = await fetch(`${(import.meta as any).env.VITE_APP_URL}/accounts/masters`);
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      addNotification({
        type: 'error',
        message: 'Failed to fetch accounts',
        title: ''
      });
    }
  };

  const handleHistoryClick = (entry: AccountEntry) => {
    setSelectedEntry(entry);
    fetchEntryHistory(entry._id);
  };


  const filterAccounts = (): void => {
    let filtered: AccountEntry[] = [...accounts];
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((account: AccountEntry) => account.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      const term: string = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (account: AccountEntry) =>
          account.name.toLowerCase().includes(term) ||
          account.code.toLowerCase().includes(term)
      );
    }

    setFilteredAccounts(filtered);
  };

  const accountTypes: AccountType[] = [
    { value: 'all', label: 'All Types' },
    { value: 'asset', label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity', label: 'Equity' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expense' }
  ];

  const getStatusColor = (status: string): ChipColor => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(event.target.value);
  };

  const handleTypeChange = (event: SelectChangeEvent<string>): void => {
    setSelectedType(event.target.value);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading accounts...</Typography>
      </Box>
    );
  }

  function handleViewClick(account: AccountEntry): void {
    throw new Error('Function not implemented.');
  }

  function handleEditClick(account: AccountEntry): void {
    throw new Error('Function not implemented.');
  }

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel>Account Type</InputLabel>
            <Select
              value={selectedType}
              onChange={handleTypeChange}
              label="Account Type"
            >
              {accountTypes.map((type: AccountType) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AccountCircleIcon color="primary" />
                <Box>
                  <Typography variant="h6">{filteredAccounts.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Accounts
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h6">
                    {filteredAccounts.filter(acc => acc.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <ErrorIcon color="error" />
                <Box>
                  <Typography variant="h6">
                    {filteredAccounts.filter(acc => acc.status === 'inactive').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Inactive
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <BusinessIcon color="info" />
                <Box>
                  <Typography variant="h6">
                    {formatCurrency(
                      filteredAccounts
                        .filter(acc => acc.type === 'asset')
                        .reduce((sum, acc) => sum + acc.balance, 0)
                    )}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Assets
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Transactions</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAccounts.map((account: AccountEntry) => (
              <TableRow key={account.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {account.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {account.code}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    color={account.balance >= 0 ? 'success.main' : 'error.main'}
                    fontWeight="medium"
                  >
                    {formatCurrency(account.balance)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                    size="small"
                    color={getStatusColor(account.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {account.transactions}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {formatDate(account.updatedAt)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        color="primary"
                        aria-label="view account details"
                        onClick={() => handleViewClick(account)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Entry">
                      <IconButton 
                        size="small" 
                        color="primary"
                        aria-label="edit account"
                        onClick={() => handleEditClick(account)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View History">
                      <IconButton 
                        size="small" 
                        color="info"
                        aria-label="view account history"
                        onClick={() => handleHistoryClick(account)}
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredAccounts.length === 0 && (
        <Paper sx={{ p: 4 }}>
          <Box textAlign="center">
            <WarningIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No accounts found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Try adjusting your search criteria or account type filter.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* History Dialog */}
      <AccountHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        history={entryHistory}
        entryName={selectedEntry?.defaultFields.companyName || ''}
      />
    </Box>
  );
};

export default ViewAccounts;