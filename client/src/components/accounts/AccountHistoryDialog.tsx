import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  Divider,
  Box
} from '@mui/material';

interface HistoryItem {
  action: 'created' | 'updated' | 'billing_date_set' | 'reminder_sent';
  details: any;
  createdAt: string;
}

interface AccountHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  history: HistoryItem[];
  entryName: string;
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'created':
      return 'success';
    case 'reminder_sent':
      return 'warning';
    case 'billing_date_set':
      return 'info';
    case 'updated':
      return 'primary';
    default:
      return 'default';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const AccountHistoryDialog: React.FC<AccountHistoryDialogProps> = ({
  open,
  onClose,
  history,
  entryName
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          History for {entryName}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <List>
          {history.map((item, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Chip
                        label={item.action.replace('_', ' ')}
                        color={getActionColor(item.action) as any}
                        size="small"
                      />
                      <Typography color="text.secondary" variant="body2">
                        {formatDate(item.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box mt={1}>
                      {item.action === 'reminder_sent' && (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Reminder sent to: {item.details.emailSentTo}
                          </Typography>
                          {item.details.daysUntilDue && (
                            <Typography variant="body2" color="text.secondary">
                              Days until due: {item.details.daysUntilDue}
                            </Typography>
                          )}
                        </>
                      )}
                      {item.action === 'created' && (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Master Type: {item.details.masterTypeName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Due Date: {item.details.dueDate ? formatDate(item.details.dueDate) : 'Not set'}
                          </Typography>
                        </>
                      )}
                      {item.action === 'billing_date_set' && (
                        <Typography variant="body2" color="text.secondary">
                          Billing Date: {formatDate(item.details.billingDate)}
                        </Typography>
                      )}
                      {item.action === 'updated' && (
                        <Typography variant="body2" color="text.secondary">
                          Updated fields: {Object.keys(item.details).join(', ')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              {index < history.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default AccountHistoryDialog;
