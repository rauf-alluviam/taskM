import React from 'react';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import { Warning, CheckCircle, Error } from '@mui/icons-material';
import { MasterEntry } from './types';
import { StyledTableCell } from './styles';
import { formatDate, getDaysUntilDue, getStatusColor, getCompanyInitials, getRandomColor } from './utils';

interface TableCellsProps {
  entry: MasterEntry;
  showAddress?: boolean;
}

export const CompanyCell: React.FC<TableCellsProps> = ({ entry }) => (
  <StyledTableCell>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar 
        sx={{ 
          width: 40, 
          height: 40,
          bgcolor: getRandomColor(entry.defaultFields.companyName),
          fontSize: '1rem',
          fontWeight: 700
        }}
      >
        {getCompanyInitials(entry.defaultFields.companyName)}
      </Avatar>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {entry.defaultFields.companyName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {entry.masterTypeName}
        </Typography>
      </Box>
    </Box>
  </StyledTableCell>
);

export const AddressCell: React.FC<TableCellsProps> = ({ entry }) => (
  <StyledTableCell>
    <Typography 
      variant="body2" 
      color="text.secondary" 
      sx={{ 
        maxWidth: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}
    >
      {entry.defaultFields.address || 'Not provided'}
    </Typography>
  </StyledTableCell>
);

export const DateCell: React.FC<TableCellsProps & { dateField: keyof MasterEntry['defaultFields'] }> = ({ entry, dateField }) => (
  <StyledTableCell>
    <Typography variant="body2">
      {formatDate(entry.defaultFields[dateField])}
    </Typography>
  </StyledTableCell>
);

export const StatusCell: React.FC<TableCellsProps> = ({ entry }) => {
  const daysUntilDue = getDaysUntilDue(entry.defaultFields.dueDate);
  const statusColor = getStatusColor(daysUntilDue);

  const getStatusIcon = () => {
    switch (statusColor) {
      case 'error':
        return <Error sx={{ fontSize: 16 }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 16 }} />;
      default:
        return <CheckCircle sx={{ fontSize: 16 }} />;
    }
  };

  return (
    <StyledTableCell>
      {daysUntilDue !== null && (
        <Chip
          size="small"
          icon={getStatusIcon()}
          label={
            daysUntilDue < 0 
              ? `${Math.abs(daysUntilDue)}d overdue`
              : `${daysUntilDue}d left`
          }
          color={statusColor}
          sx={{ 
            fontWeight: 600,
            fontSize: '0.75rem',
            '& .MuiChip-icon': {
              fontSize: '1rem'
            }
          }}
        />
      )}
    </StyledTableCell>
  );
};
