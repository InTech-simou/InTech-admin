import { useEffect, useState } from 'react';
import { TickCircle, InfoCircle, Warning2, Danger, CloseCircle } from 'iconsax-react';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';
interface ToastMessage { id: number; tone: ToastTone; title: string; description?: string }
type ToastInput = Omit<ToastMessage, 'id'>;
const eventName = 'intech:toast';
let nextId = 0;

export function showToast(input: ToastInput) {
  window.dispatchEvent(new CustomEvent<ToastMessage>(eventName, { detail: { ...input, id: ++nextId } }));
}

const icons = { success: TickCircle, info: InfoCircle, warning: Warning2, error: Danger };

export function ToastCenter() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  useEffect(() => {
    const timers = new Map<number, number>();
    const receive = (event: Event) => {
      const message = (event as CustomEvent<ToastMessage>).detail;
      setMessages(current => [...current, message].slice(-5));
      timers.set(message.id, window.setTimeout(() => {
        setMessages(current => current.filter(item => item.id !== message.id));
        timers.delete(message.id);
      }, message.tone === 'error' ? 8000 : 5000));
    };
    window.addEventListener(eventName, receive);
    return () => { window.removeEventListener(eventName, receive); timers.forEach(timer => window.clearTimeout(timer)); };
  }, []);
  return <div className="toast-center" aria-live="polite" aria-label="Messages de l’application">{messages.map(message => {
    const Icon = icons[message.tone];
    return <div className={`app-toast ${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'} key={message.id}>
      <Icon size={19} variant="Bold" />
      <div><strong>{message.title}</strong>{message.description && <p>{message.description}</p>}</div>
      <button type="button" aria-label="Fermer ce message" onClick={() => setMessages(current => current.filter(item => item.id !== message.id))}><CloseCircle size={16} /></button>
    </div>;
  })}</div>;
}
