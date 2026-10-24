import { createRoot } from 'react-dom/client';
import { installApiFallback } from './apiFallback';
import App from './App.tsx';
import './index.css';

installApiFallback();

createRoot(document.getElementById('root')!).render(<App />);
