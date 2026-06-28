import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GCalProvider } from './gcal/GCalContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GCalProvider>
      <App />
    </GCalProvider>
  </StrictMode>,
);
