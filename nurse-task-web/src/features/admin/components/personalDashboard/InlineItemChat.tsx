import React, { useState } from 'react';
import type { ItemChatMessage, UserRoleInfo } from '../../types/personalDashboard';

// Teams風の引用表示（> や 引用文）をチャットバブル内で視覚的にレンダリングするコンポーネント
export const TeamsFormattedText: React.FC<{ text: string; isNurseSender?: boolean }> = ({ text, isNurseSender }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
          const content = trimmed.replace(/^>\s*/, '');
          return (
            <blockquote
              key={idx}
              className={`border-l-4 p-2 rounded-r-lg text-xs font-bold italic my-1 shadow-2xs ${
                isNurseSender
                  ? 'border-blue-300 bg-blue-700/80 text-blue-50'
                  : 'border-purple-500 bg-purple-50/90 text-purple-950 not-italic'
              }`}
            >
              <div className="text-[10px] font-black opacity-90 not-italic mb-0.5 flex items-center gap-1">
                <span>💬 引用:</span>
              </div>
              <p>“{content}”</p>
            </blockquote>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {line}
          </p>
        );
      })}
    </div>
  );
};

// 💬 各振り返り項目直下に埋め込まれる再利用可能インライン対話チャットコンポーネント
export const InlineItemChat: React.FC<{
  title?: string;
  messages: ItemChatMessage[];
  onSendMessage: (text: string) => void;
  onEditMessage?: (msgId: string, newText: string) => void;
  onDeleteMessage?: (msgId: string) => void;
  currentUser: UserRoleInfo;
  placeholder?: string;
  badgeName?: string;
}> = ({ title, messages, onSendMessage, onEditMessage, onDeleteMessage, currentUser, placeholder, badgeName }) => {
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editingText.trim() || !onEditMessage) return;
    onEditMessage(msgId, editingText.trim());
    setEditingId(null);
    setEditingText('');
  };

  return (
    <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 flex flex-col gap-2.5 shadow-2xs">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-amber-200/80 pb-1.5">
        <span className="text-[11px] font-extrabold text-amber-950 flex items-center gap-1.5">
          <span>💬</span> {title || '指導・対話コメントチャット'}:
          <span className="text-[10px] font-black text-purple-900 bg-purple-100 px-2 py-0.2 rounded-full border border-purple-200">
            {messages.length} 件
          </span>
        </span>
        {badgeName && (
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
            {badgeName}
          </span>
        )}
      </div>

      {/* メッセージ対話タイムライン */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {messages.map((msg) => {
          const isNurseSender = msg.senderRole === 'nurse';
          const isEditing = editingId === msg.id;

          return (
            <div key={msg.id} className={`flex items-start gap-2 ${isNurseSender ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 border shadow-2xs mt-0.5 ${
                  isNurseSender ? 'bg-blue-100 border-blue-300' : 'bg-purple-100 border-purple-300'
                }`}
              >
                {msg.senderAvatarEmoji || (isNurseSender ? '🌱' : '👩‍⚕️')}
              </div>

              <div className={`max-w-[88%] flex flex-col ${isNurseSender ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 mb-0.5">
                  <span className={isNurseSender ? 'text-blue-900 font-black' : 'text-purple-900 font-black'}>
                    {msg.senderName}
                  </span>
                  <span>•</span>
                  <span className="text-slate-400 font-normal">
                    {msg.createdAt}
                    {msg.updatedAt && <span className="text-purple-600 ml-0.5">(編集済)</span>}
                  </span>

                  {!isEditing && currentUser.id === msg.senderId && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(msg.id);
                          setEditingText(msg.text);
                        }}
                        className="text-[8px] font-extrabold text-slate-500 hover:text-purple-700 px-1 rounded hover:bg-slate-200 cursor-pointer"
                      >
                        ✏️
                      </button>
                      {onDeleteMessage && (
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(msg.id)}
                          className="text-[8px] font-extrabold text-slate-400 hover:text-red-600 px-1 rounded hover:bg-red-50 cursor-pointer"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="w-full flex flex-col gap-1 bg-white p-1.5 rounded-lg border border-purple-300 mt-0.5">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-slate-300 font-medium"
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-0.5 text-[9px] bg-slate-100 rounded text-slate-600 font-bold"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(msg.id)}
                        className="px-2 py-0.5 text-[9px] bg-purple-700 text-white rounded font-black"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-medium leading-relaxed shadow-2xs ${
                      isNurseSender
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-purple-950 border border-purple-200 rounded-tl-none'
                    }`}
                  >
                    <TeamsFormattedText text={msg.text} isNurseSender={isNurseSender} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <p className="text-[11px] font-medium text-amber-700/70 italic text-center py-2">
            （まだこの項目に対するコメント対話はありません。下の入力欄からメッセージを送信できます）
          </p>
        )}
      </div>

      {/* 対話メッセージ入力欄 */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-amber-200/60">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder || `${currentUser.name}としてコメント返信を入力...`}
          className="flex-1 text-xs p-2 rounded-lg border border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs"
        />
        <button
          type="button"
          onClick={handleSend}
          className="!px-3 !py-2 !bg-purple-700 hover:!bg-purple-800 !text-white !text-xs !font-black !rounded-lg !shadow-2xs !transition-all !shrink-0 !flex !items-center !gap-1 !cursor-pointer active:!scale-95"
        >
          送信
        </button>
      </div>
    </div>
  );
};
