import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { RestaurantProvider } from './context/RestaurantContext';
import { BotProvider } from './context/BotContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <RestaurantProvider>
    <BotProvider>
      <App />
    </BotProvider>
  </RestaurantProvider>
);