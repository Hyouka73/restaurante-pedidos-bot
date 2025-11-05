import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { RestaurantProvider } from './context/RestaurantContext';
import { BotProvider } from './context/BotContext';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <RestaurantProvider>
    <BotProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BotProvider>
  </RestaurantProvider>
);