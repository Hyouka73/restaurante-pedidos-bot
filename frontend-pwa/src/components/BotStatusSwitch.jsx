// frontend-pwa/src/components/BotStatusSwitch.jsx
// frontend-pwa/src/components/BotStatusSwitch.jsx
import { useBot } from '../context/BotContext';
import { useAlert } from './ui/CustomAlert';
import { ButtonLoader } from './ui/Loader';
import { Bot } from 'lucide-react';

export default function BotStatusSwitch() {
  const { status, loading, startBot, stopBot } = useBot();
  const { showAlert } = useAlert();

  const handleToggle = async () => {
    try {
      if (status?.running) {
        const result = await stopBot();
        if (result.success) {
          showAlert('Bot detenido correctamente', 'success', 3000);
        } else {
          throw new Error(result.error);
        }
      } else {
        const result = await startBot();
        if (result.success) {
          showAlert('Bot iniciado correctamente', 'success', 3000);
        } else {
          throw new Error(result.error);
        }
      }
    } catch (err) {
      showAlert(`Error: ${err.message}`, 'error', 5000);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
      <Bot size={20} className={status?.running ? 'text-green-600' : 'text-gray-400'} />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Bot Telegram</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={status?.running || false}
            onChange={handleToggle}
            disabled={loading}
            className="sr-only peer"
          />
          <div className={`
            w-11 h-6 bg-gray-200 rounded-full peer
            peer-focus:ring-4 peer-focus:ring-green-300
            dark:peer-focus:ring-green-800
            peer-checked:after:translate-x-full
            peer-checked:after:border-white
            after:content-['']
            after:absolute
            after:top-0.5
            after:left-[2px]
            after:bg-white
            after:border-gray-300
            after:border
            after:rounded-full
            after:h-5
            after:w-5
            after:transition-all
            ${status?.running ? 'bg-green-600' : 'bg-gray-200'}
          `}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <ButtonLoader size="xs" />
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}