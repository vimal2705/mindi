import { useState } from 'react';
import type { ChatMessageDTO } from '@mindi-coat/shared';

const QUICK_EMOJIS = ['👍', '😂', '🔥', '👏', '🎉', '😮', '💪', '🎴'];

interface RoomChatProps {
  messages: ChatMessageDTO[];
  onSend: (message: string) => void;
  onEmoji: (emoji: string) => void;
}

export function RoomChat({ messages, onSend, onEmoji }: RoomChatProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="glass rounded-xl flex flex-col h-64 md:h-full min-h-48">
      <div className="px-3 py-2 border-b border-slate-700 font-semibold text-sm">Room Chat</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
        {messages.map((msg) => (
          <div key={msg.id}>
            <span className="text-amber-400 font-medium">{msg.displayName}: </span>
            <span>{msg.message}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-slate-500 text-center py-4">No messages yet</p>
        )}
      </div>
      <div className="flex gap-1 p-2 border-t border-slate-700 overflow-x-auto">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onEmoji(emoji)}
            className="text-lg hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-slate-700">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-lg text-sm font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
