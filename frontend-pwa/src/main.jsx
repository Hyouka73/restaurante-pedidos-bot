import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RestaurantProvider } from './context/RestaurantContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RestaurantProvider>
      <App />
    </RestaurantProvider>
  </StrictMode>,
)
