import { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

type ToastType = 'error' | 'success' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const iconMap = {
  error: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const colorMap = {
  error: {
    bg: 'bg-red-950/90',
    border: 'border-red-800/60',
    icon: 'text-red-400',
    text: 'text-red-100',
    subtext: 'text-red-300/80',
    progress: 'bg-red-500',
  },
  success: {
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-800/60',
    icon: 'text-emerald-400',
    text: 'text-emerald-100',
    subtext: 'text-emerald-300/80',
    progress: 'bg-emerald-500',
  },
  info: {
    bg: 'bg-sky-950/90',
    border: 'border-sky-800/60',
    icon: 'text-sky-400',
    text: 'text-sky-100',
    subtext: 'text-sky-300/80',
    progress: 'bg-sky-500',
  },
};

const Toast = ({ message, type = 'info', duration = 4000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <div
      className={`fixed top-24 left-1/2 z-50 transition-all duration-300 ease-out ${
        isVisible && !isLeaving
          ? 'translate-x-[-50%] translate-y-0 opacity-100'
          : 'translate-x-[-50%] translate-y-[-12px] opacity-0'
      }`}
    >
      <div
        className={`${colors.bg} ${colors.border} border backdrop-blur-xl rounded-xl shadow-2xl shadow-black/40 overflow-hidden min-w-[320px] max-w-[420px]`}
      >
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div className={`${colors.icon} mt-0.5 flex-shrink-0`}>
            <Icon size={18} strokeWidth={2.5} />
          </div>
          <p className={`${colors.text} text-sm font-medium leading-snug flex-1`}>
            {message}
          </p>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
        <div className="h-[2px] w-full bg-gray-800/50">
          <div
            className={`h-full ${colors.progress} rounded-full`}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Toast;
