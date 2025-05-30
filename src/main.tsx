// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

const theme = createTheme({
  // Your theme overrides
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" zIndex={2000} /> {/* Ensure high zIndex */}
      <App />
    </MantineProvider>
  </StrictMode>,
);