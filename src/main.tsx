import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import './typography.css';
import './navigation.css';
import './table-layout.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root is missing.');
createRoot(root).render(<App />);
