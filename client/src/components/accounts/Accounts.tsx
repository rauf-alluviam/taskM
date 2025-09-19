import React, { useState } from 'react';
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { Forms} from "./Forms.tsx";
import ViewAccounts from "./ViewAccounts.tsx";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`accounts-tabpanel-${index}`}
      aria-labelledby={`accounts-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `accounts-tab-${index}`,
    'aria-controls': `accounts-tabpanel-${index}`,
  };
}

const Accounts: React.FC = () => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="account management tabs"
        >
          <Tab label="Forms" {...a11yProps(0)} />
          <Tab label="View" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <Forms />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ViewAccounts />
      </TabPanel>
    </Box>
  );
};

export default Accounts;
