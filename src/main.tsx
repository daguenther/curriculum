// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications'; // Import Notifications
import '@mantine/notifications/styles.css'; // Import Notifications styles

// Optional: Define a custom theme or use the default
const theme = createTheme({
  // Your theme overrides
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" /> {/* Add Notifications provider */}
      <App />
    </MantineProvider>
  </StrictMode>,
);