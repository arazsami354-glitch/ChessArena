import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType, collection, query, orderBy, limit, addDoc, onSnapshot } from '../firebase';
import { UserProfile, ChatMessage } from '../types';
import { Send, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';

interface GlobalChatTabProps {
  userProfile: UserProfile | null;
}

export default function GlobalChatTab({ userProfile }: GlobalChatTabProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when new messages arrive
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const q = query(
      collection(db, 'global_chat'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList: any[] = [];
      snapshot.forEach((doc) => {
        msgList.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgList);
      setLoading(false);
      // Timeout is used to ensure React rendering is completed
      setTimeout(scrollToBottom, 100);
    }, (err) => {
      console.error("Global Chat Snapshot Error:", err);
      setError("Failed to fetch chat logs in real-time.");
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, 'global_chat');
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!inputText.trim()) return;

    try {
      const msgData = {
        userId: userProfile.uid,
        username: userProfile.username,
        text: inputText.trim(),
        isAdmin: userProfile.isAdmin || false,
        createdAt: new Date().toISOString()
      };

      setInputText('');
      await addDoc(collection(db, 'global_chat'), msgData);
    } catch (err: any) {
      console.error("Send message failed:", err);
      handleFirestoreError(err, OperationType.CREATE, 'global_chat');
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="md" label="Connecting to Chat Server..." />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[550px]">
      {/* Chat Header */}
      <div className="p-4 border-b border-zinc-800/60 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-zinc-400" />
          <h3 className="font-display font-semibold text-white text-sm">Global Community Lobby</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Chat Online</span>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-red-950/40 border-b border-red-900 flex items-center gap-2 text-red-300 text-xs font-semibold px-4">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-950/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <MessageSquare size={32} className="text-zinc-700 animate-pulse" />
            <span className="text-zinc-500 text-xs">No global chat logs found. Start the conversation!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = userProfile?.uid === msg.userId;
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[80%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 mb-0.5">
                  <span className={msg.isAdmin ? 'text-yellow-500 font-extrabold' : 'text-zinc-400'}>
                    {msg.username}
                  </span>
                  {msg.isAdmin && (
                    <span className="text-[8px] bg-yellow-950/50 text-yellow-500 px-1 border border-yellow-900 rounded font-bold uppercase">
                      Admin
                    </span>
                  )}
                  <span className="text-[9px] text-zinc-600 font-normal">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div 
                  className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed font-medium break-all ${
                    isSelf 
                      ? 'bg-white text-black rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-750'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Message Input Box */}
      <div className="p-4 border-t border-zinc-800/60 bg-zinc-950">
        {userProfile ? (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              id="global-chat-input"
              type="text"
              placeholder="Message Global Community..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={250}
              className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
            />
            <button 
              id="global-chat-send"
              type="submit"
              className="p-2.5 bg-white text-black hover:bg-zinc-200 transition-all rounded-xl cursor-pointer flex items-center justify-center shrink-0 shadow"
            >
              <Send size={15} />
            </button>
          </form>
        ) : (
          <div className="text-center py-2 text-xs text-zinc-500 font-semibold">
            Please sign in to join community conversation.
          </div>
        )}
      </div>
    </div>
  );
}
