import React from 'react';
import type {
  StaffProfile,
  UserRoleInfo,
  ModularReflection,
  KPTReflection,
  KolbReflection,
  ItemChatMessage,
} from '../../types/personalDashboard';
import { InlineItemChat } from './InlineItemChat';

interface DailyReflectionSectionProps {
  currentStaff: StaffProfile;
  effectiveTargetId: string;
  currentUser: UserRoleInfo;
  isReflectionEditable: boolean;
  isViewingSelf?: boolean;
  preceptorBadgeName: string;
  currentFormat: 'free' | 'kpt' | 'kolb' | 'modular';
  setReflectionFormats: React.Dispatch<React.SetStateAction<Record<string, 'free' | 'kpt' | 'kolb' | 'modular'>>>;
  modularReflections: Record<string, ModularReflection[]>;
  handleAddModularReflection: () => void;
  handleDeleteModularReflection: (refId: string) => void;
  handleUpdateModularReflection: (refId: string, field: keyof ModularReflection, value: string) => void;
  handleSendModularComment: (refId: string, text: string) => void;
  handleEditModularComment: (refId: string, msgId: string, newText: string) => void;
  handleDeleteModularComment: (refId: string, msgId: string) => void;
  userFreeReflections: Record<string, string>;
  setUserFreeReflections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  userFreeChats: Record<string, ItemChatMessage[]>;
  handleSendFreeComment: (text: string) => void;
  userKPTReflections: Record<string, KPTReflection>;
  setUserKPTReflections: React.Dispatch<React.SetStateAction<Record<string, KPTReflection>>>;
  userKPTChats: Record<string, { keepComments: ItemChatMessage[]; problemComments: ItemChatMessage[]; tryComments: ItemChatMessage[] }>;
  handleSendKPTComment: (typeKey: 'keepComments' | 'problemComments' | 'tryComments', text: string) => void;
  userKolbReflections: Record<string, KolbReflection>;
  setUserKolbReflections: React.Dispatch<React.SetStateAction<Record<string, KolbReflection>>>;
  userKolbChats: Record<string, { expRefComments: ItemChatMessage[]; conceptExpComments: ItemChatMessage[] }>;
  handleSendKolbComment: (typeKey: 'expRefComments' | 'conceptExpComments', text: string) => void;
  isSaveSuccess: boolean;
  setIsSaveSuccess: (val: boolean) => void;
  onSaveReflection?: () => void;
  autoSaveStatus?: 'saved' | 'saving' | 'idle';
  lastSavedTime?: string;
  selectedDate?: string;
}

export const DailyReflectionSection: React.FC<DailyReflectionSectionProps> = ({
  currentStaff,
  effectiveTargetId,
  currentUser,
  isReflectionEditable,
  isViewingSelf = false,
  preceptorBadgeName,
  currentFormat,
  setReflectionFormats,
  modularReflections,
  handleAddModularReflection,
  handleDeleteModularReflection,
  handleUpdateModularReflection,
  handleSendModularComment,
  handleEditModularComment,
  handleDeleteModularComment,
  userFreeReflections,
  setUserFreeReflections,
  userFreeChats,
  handleSendFreeComment,
  userKPTReflections,
  setUserKPTReflections,
  userKPTChats,
  handleSendKPTComment,
  userKolbReflections,
  setUserKolbReflections,
  userKolbChats,
  handleSendKolbComment,
  isSaveSuccess,
  setIsSaveSuccess,
  onSaveReflection,
  autoSaveStatus = 'idle',
  lastSavedTime = '',
  selectedDate,
}) => {
  return (
    <section className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
      {/* ヘッダー＆フォーマット選択＆権限バッジ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
        <div>
          <h3 className="text-base lg:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span className="text-xl">📝</span> {selectedDate ? `${selectedDate} の振り返り` : '本日の振り返り'}（項目別対話チャット連動）
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            各課題や振り返り項目の直下に対話チャットスレッドを完備。看護師と指導者が双方向でスレッド返信可能
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 振り返りフォーマット切り替えドロップダウン */}
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl shadow-2xs">
            <label htmlFor="framework-select" className="text-xs font-extrabold text-blue-950 flex items-center gap-1 shrink-0">
              <span>📊</span> 振り返り枠:
            </label>
            <div className="relative inline-flex items-center max-w-full">
              <select
                id="framework-select"
                value={currentFormat}
                onChange={(e) =>
                  setReflectionFormats((prev) => ({
                    ...prev,
                    [effectiveTargetId]: e.target.value as 'free' | 'kpt' | 'kolb' | 'modular',
                  }))
                }
                style={{ paddingRight: '36px' }}
                className="!appearance-none !bg-white !text-slate-900 !font-black !text-xs !pl-3 !py-1 !rounded-lg !border !border-blue-300 focus:!outline-none focus:!ring-2 focus:!ring-blue-500 hover:!border-blue-400 !transition-all !cursor-pointer !shadow-2xs !truncate"
              >
                <option value="modular">🧱 モジュール型課題振り返り (課題カード別対話)</option>
                <option value="free">📝 自由記述 (Free Text)</option>
                <option value="kpt">📊 KPT法 (Keep / Problem / Try)</option>
                <option value="kolb">🔄 経験学習モデル (Kolb Cycle)</option>
              </select>
              <svg
                className="w-4 h-4 text-blue-600 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 stroke-[2.5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* 権限状態インジケーターバッジ */}
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-full border shadow-2xs ${
              isReflectionEditable
                ? 'bg-blue-50 text-blue-900 border-blue-200'
                : 'bg-purple-50 text-purple-900 border-purple-200'
            }`}
          >
            {isReflectionEditable
              ? isViewingSelf
                ? '✏️ 自己評価入力可能 (本人ログイン)'
                : '✏️ 指導者編集・課題追加可能 (管理者権限)'
              : '🔒 閲覧専用モード (他者表示)'}
          </span>
        </div>
      </div>

      {/* 全幅ワンカラムレイアウト（チャットは各項目直下に内包） */}
      <div className="w-full bg-blue-50/50 border border-blue-200 rounded-2xl p-4 flex flex-col gap-4 select-text">
        <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
          <h4 className="text-xs lg:text-sm font-extrabold text-blue-950 flex items-center gap-1.5">
            <span>🌱</span> 本人の気づき ＆ 項目別対話チャットスレッド
            <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
              {currentFormat === 'modular'
                ? 'モジュール型 (動的カード別チャット)'
                : currentFormat === 'free'
                ? '自由記述チャット'
                : currentFormat === 'kpt'
                ? 'KPT項目別チャット'
                : '経験学習グループチャット'}
            </span>
          </h4>
          <span className="text-[10px] font-extrabold text-slate-500">
            {currentStaff.user.name} 振り返り対象
          </span>
        </div>

        {/* --- 1) モジュール型課題別振り返りフォーマット（各カードごとに独立チャット内包） --- */}
        {currentFormat === 'modular' && (
          <div className="flex flex-col gap-5">
            {(modularReflections[effectiveTargetId] || []).map((refItem, index) => {
              return (
                <div
                  key={refItem.id}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative"
                >
                  {/* カードヘッダー */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                        課題 #{index + 1}
                      </span>

                      {isReflectionEditable ? (
                        <select
                          value={refItem.type}
                          onChange={(e) => handleUpdateModularReflection(refItem.id, 'type', e.target.value)}
                          className={`!text-xs !font-black !px-2.5 !py-1 !rounded-lg !border !shadow-2xs !cursor-pointer focus:!outline-none shrink-0 ${
                            refItem.type === '課題'
                              ? '!bg-red-100 !text-red-900 !border-red-300'
                              : refItem.type === '学び'
                              ? '!bg-emerald-100 !text-emerald-900 !border-emerald-300'
                              : refItem.type === '改善点'
                              ? '!bg-amber-100 !text-amber-900 !border-amber-300'
                              : '!bg-blue-100 !text-blue-900 !border-blue-300'
                          }`}
                        >
                          <option value="課題">📌 課題 (Problem)</option>
                          <option value="学び">🌱 学び (Learning)</option>
                          <option value="改善点">💡 改善点 (Try)</option>
                          <option value="その他">📝 その他</option>
                        </select>
                      ) : (
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-lg border shadow-2xs shrink-0 ${
                            refItem.type === '課題'
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : refItem.type === '学び'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : refItem.type === '改善点'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}
                        >
                          {refItem.type === '課題'
                            ? '📌 課題'
                            : refItem.type === '学び'
                            ? '🌱 学び'
                            : refItem.type === '改善点'
                            ? '💡 改善点'
                            : '📝 その他'}
                        </span>
                      )}

                      {isReflectionEditable ? (
                        <input
                          type="text"
                          value={refItem.title}
                          onChange={(e) => handleUpdateModularReflection(refItem.id, 'title', e.target.value)}
                          placeholder="課題のタイトル (例: 11時台の体位変換の遅延)"
                          className="flex-1 min-w-[140px] text-xs sm:text-sm font-extrabold text-slate-900 p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 focus:bg-white"
                        />
                      ) : (
                        <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate flex-1">
                          {refItem.title || '（無題の課題）'}
                        </h5>
                      )}
                    </div>

                    {isReflectionEditable && (
                      <button
                        type="button"
                        onClick={() => handleDeleteModularReflection(refItem.id)}
                        className="!px-2.5 !py-1 !bg-red-50 hover:!bg-red-100 !text-red-700 !text-xs !font-bold !rounded-lg !border !border-red-200 !cursor-pointer !transition-colors !flex !items-center !gap-1 shadow-2xs shrink-0"
                        title="このカードを削除"
                      >
                        🗑️ 削除
                      </button>
                    )}
                  </div>

                  {/* 看護師 振り返り本文 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">
                      📝 課題・振り返りの詳細内容:
                    </label>
                    {isReflectionEditable ? (
                      <textarea
                        rows={3}
                        value={refItem.content}
                        onChange={(e) => handleUpdateModularReflection(refItem.id, 'content', e.target.value)}
                        placeholder="具体的に何が起こり、どう感じたか、次回の対策を記入してください..."
                        className="w-full text-xs sm:text-sm font-medium p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs leading-relaxed"
                      />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 leading-relaxed min-h-[50px] whitespace-pre-wrap">
                        {refItem.content || '（内容がまだ記入されていません）'}
                      </div>
                    )}
                  </div>

                  {/* 💬 この課題カード専用のインライン対話チャットスレッド 【要件】 */}
                  <InlineItemChat
                    title={`この課題（${refItem.title || '無題'}）に対する対話チャット`}
                    messages={refItem.comments || []}
                    onSendMessage={(text) => handleSendModularComment(refItem.id, text)}
                    onEditMessage={(msgId, newText) => handleEditModularComment(refItem.id, msgId, newText)}
                    onDeleteMessage={(msgId) => handleDeleteModularComment(refItem.id, msgId)}
                    currentUser={currentUser}
                    placeholder={`${currentUser.name}としてこの課題へのアドバイス・返信を入力...`}
                    badgeName={preceptorBadgeName}
                  />
                </div>
              );
            })}

            {(modularReflections[effectiveTargetId] || []).length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs font-bold text-slate-400">
                課題・振り返りカードがまだありません。「＋ 新しい課題・振り返りを追加」ボタンで作成してください。
              </div>
            )}

            {isReflectionEditable && (
              <button
                type="button"
                onClick={handleAddModularReflection}
                className="!w-full !py-3 !bg-blue-50 hover:!bg-blue-100 !text-blue-800 !font-extrabold !text-xs sm:!text-sm !border-2 !border-dashed !border-blue-300 hover:!border-blue-400 !rounded-2xl !flex !items-center !justify-center !gap-2 !cursor-pointer !transition-all !shadow-2xs active:!scale-[0.99]"
              >
                <span className="text-base">➕</span> 新しい課題・振り返りを追加
              </button>
            )}
          </div>
        )}

        {/* --- 2) 自由記述フォーマット（専用チャットスレッド内包） --- */}
        {currentFormat === 'free' && (
          <div className="flex flex-col rounded-2xl overflow-hidden border border-blue-200 shadow-2xs bg-white">
            <div className="p-3.5 border-b border-blue-100">
              <label className="text-xs font-extrabold text-blue-950 block mb-1">
                📝 看護師の自由記述内容:
              </label>
              {isReflectionEditable ? (
                <textarea
                  rows={5}
                  value={userFreeReflections[effectiveTargetId] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserFreeReflections((prev) => ({ ...prev, [effectiveTargetId]: val }));
                    setIsSaveSuccess(false);
                  }}
                  placeholder="本日の看護ケアでうまくできたこと、気づいた課題、明日への改善点を記入してください..."
                  className="w-full text-xs lg:text-sm font-medium p-3 rounded-xl border border-blue-300 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs lg:text-sm font-medium text-slate-800 leading-relaxed min-h-[110px] whitespace-pre-wrap">
                  {userFreeReflections[effectiveTargetId] || '（まだ自由記述の振り返りが記入されていません）'}
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50/50">
              <InlineItemChat
                title="自由記述への指導・対話チャット"
                messages={userFreeChats[effectiveTargetId] || []}
                onSendMessage={handleSendFreeComment}
                currentUser={currentUser}
                placeholder={`${currentUser.name}として全体の振り返りへのコメント・返信を入力...`}
                badgeName={preceptorBadgeName}
              />
            </div>
          </div>
        )}

        {/* --- 3) KPT法フォーマット（各項目直下 インライン対話チャット） --- */}
        {currentFormat === 'kpt' && (
          <div className="flex flex-col gap-4">
            {/* Keep チャット */}
            <div className="flex flex-col rounded-2xl overflow-hidden border border-emerald-300 shadow-2xs bg-white">
              <div className="bg-emerald-50/90 p-3">
                <label className="text-[11px] font-black text-emerald-900 block mb-1">
                  🟢 Keep (継続すること・うまくできた点):
                </label>
                {isReflectionEditable ? (
                  <textarea
                    rows={2}
                    value={userKPTReflections[effectiveTargetId]?.keep ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserKPTReflections((prev) => ({
                        ...prev,
                        [effectiveTargetId]: { ...prev[effectiveTargetId], keep: val },
                      }));
                      setIsSaveSuccess(false);
                    }}
                    placeholder="今後も継続したい良い習慣や上手くいったケア内容..."
                    className="w-full text-xs p-2.5 rounded-lg border border-emerald-300 bg-white text-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="text-xs font-medium text-emerald-950 bg-white p-2.5 rounded-lg border border-emerald-200">
                    {userKPTReflections[effectiveTargetId]?.keep || '（記入なし）'}
                  </p>
                )}
              </div>

              <div className="p-2.5 bg-amber-50/60">
                <InlineItemChat
                  title="Keepに対する対話チャット"
                  messages={userKPTChats[effectiveTargetId]?.keepComments || []}
                  onSendMessage={(text) => handleSendKPTComment('keepComments', text)}
                  currentUser={currentUser}
                  placeholder={`${currentUser.name}としてKeepへのフィードバック・返信を入力...`}
                />
              </div>
            </div>

            {/* Problem チャット */}
            <div className="flex flex-col rounded-2xl overflow-hidden border border-amber-300 shadow-2xs bg-white">
              <div className="bg-amber-50/90 p-3">
                <label className="text-[11px] font-black text-amber-900 block mb-1">
                  🟡 Problem (課題・反省点・時間の押し):
                </label>
                {isReflectionEditable ? (
                  <textarea
                    rows={2}
                    value={userKPTReflections[effectiveTargetId]?.problem ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserKPTReflections((prev) => ({
                        ...prev,
                        [effectiveTargetId]: { ...prev[effectiveTargetId], problem: val },
                      }));
                      setIsSaveSuccess(false);
                    }}
                    placeholder="今回うまく出来なかった点、遅延の原因..."
                    className="w-full text-xs p-2.5 rounded-lg border border-amber-300 bg-white text-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="text-xs font-medium text-amber-950 bg-white p-2.5 rounded-lg border border-amber-200">
                    {userKPTReflections[effectiveTargetId]?.problem || '（記入なし）'}
                  </p>
                )}
              </div>

              <div className="p-2.5 bg-amber-50/60">
                <InlineItemChat
                  title="Problemに対する対話チャット"
                  messages={userKPTChats[effectiveTargetId]?.problemComments || []}
                  onSendMessage={(text) => handleSendKPTComment('problemComments', text)}
                  currentUser={currentUser}
                  placeholder={`${currentUser.name}としてProblemへのフィードバック・返信を入力...`}
                />
              </div>
            </div>

            {/* Try チャット */}
            <div className="flex flex-col rounded-2xl overflow-hidden border border-blue-300 shadow-2xs bg-white">
              <div className="bg-blue-50/90 p-3">
                <label className="text-[11px] font-black text-blue-900 block mb-1">
                  🔵 Try (次回挑戦すること・具体的アクション):
                </label>
                {isReflectionEditable ? (
                  <textarea
                    rows={2}
                    value={userKPTReflections[effectiveTargetId]?.try ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserKPTReflections((prev) => ({
                        ...prev,
                        [effectiveTargetId]: { ...prev[effectiveTargetId], try: val },
                      }));
                      setIsSaveSuccess(false);
                    }}
                    placeholder="明日から実践する具体的な行動計画..."
                    className="w-full text-xs p-2.5 rounded-lg border border-blue-300 bg-white text-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="text-xs font-medium text-blue-950 bg-white p-2.5 rounded-lg border border-blue-200">
                    {userKPTReflections[effectiveTargetId]?.try || '（記入なし）'}
                  </p>
                )}
              </div>

              <div className="p-2.5 bg-amber-50/60">
                <InlineItemChat
                  title="Tryに対する対話チャット"
                  messages={userKPTChats[effectiveTargetId]?.tryComments || []}
                  onSendMessage={(text) => handleSendKPTComment('tryComments', text)}
                  currentUser={currentUser}
                  placeholder={`${currentUser.name}としてTryへのフィードバック・返信を入力...`}
                />
              </div>
            </div>
          </div>
        )}

        {/* --- 4) 経験学習モデル (Kolb) フォーマット（各グループ直下 インライン対話チャット） --- */}
        {currentFormat === 'kolb' && (
          <div className="flex flex-col gap-4">
            {/* グループ1: 1. 具体的経験 & 2. 内省的観察 */}
            <div className="flex flex-col rounded-2xl overflow-hidden border border-indigo-300 shadow-2xs bg-white">
              <div className="bg-indigo-50/90 p-3 flex flex-col gap-2.5">
                <div>
                  <label className="text-[11px] font-black text-indigo-900 block mb-1">
                    1. 具体的経験 (Experience):
                  </label>
                  {isReflectionEditable ? (
                    <input
                      type="text"
                      value={userKolbReflections[effectiveTargetId]?.experience ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserKolbReflections((prev) => ({
                          ...prev,
                          [effectiveTargetId]: { ...prev[effectiveTargetId], experience: val },
                        }));
                        setIsSaveSuccess(false);
                      }}
                      placeholder="本日体験した具体的な事例・出来事..."
                      className="w-full text-xs p-2 rounded-lg border border-indigo-300 bg-white text-slate-900 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs font-medium text-indigo-950 bg-white p-2 rounded-lg border border-indigo-200">
                      {userKolbReflections[effectiveTargetId]?.experience || '（記入なし）'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black text-indigo-900 block mb-1">
                    2. 内省的観察 (Reflection):
                  </label>
                  {isReflectionEditable ? (
                    <input
                      type="text"
                      value={userKolbReflections[effectiveTargetId]?.reflection ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserKolbReflections((prev) => ({
                          ...prev,
                          [effectiveTargetId]: { ...prev[effectiveTargetId], reflection: val },
                        }));
                        setIsSaveSuccess(false);
                      }}
                      placeholder="なぜそうなったのか、多角的なふりかえり..."
                      className="w-full text-xs p-2 rounded-lg border border-indigo-300 bg-white text-slate-900 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs font-medium text-indigo-950 bg-white p-2 rounded-lg border border-indigo-200">
                      {userKolbReflections[effectiveTargetId]?.reflection || '（記入なし）'}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/60">
                <InlineItemChat
                  title="経験・省察に対する共感・対話チャット"
                  messages={userKolbChats[effectiveTargetId]?.expRefComments || []}
                  onSendMessage={(text) => handleSendKolbComment('expRefComments', text)}
                  currentUser={currentUser}
                  placeholder={`${currentUser.name}として経験・省察への助言・返信を入力...`}
                />
              </div>
            </div>

            {/* グループ2: 3. 抽象的概念化 & 4. 能動的試行 */}
            <div className="flex flex-col rounded-2xl overflow-hidden border border-indigo-300 shadow-2xs bg-white">
              <div className="bg-indigo-50/90 p-3 flex flex-col gap-2.5">
                <div>
                  <label className="text-[11px] font-black text-indigo-900 block mb-1">
                    3. 抽象的概念化 (Conceptualization):
                  </label>
                  {isReflectionEditable ? (
                    <input
                      type="text"
                      value={userKolbReflections[effectiveTargetId]?.conceptual ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserKolbReflections((prev) => ({
                          ...prev,
                          [effectiveTargetId]: { ...prev[effectiveTargetId], conceptual: val },
                        }));
                        setIsSaveSuccess(false);
                      }}
                      placeholder="他の事例にも応用できる法則・学びの言語化..."
                      className="w-full text-xs p-2 rounded-lg border border-indigo-300 bg-white text-slate-900 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs font-medium text-indigo-950 bg-white p-2 rounded-lg border border-indigo-200">
                      {userKolbReflections[effectiveTargetId]?.conceptual || '（記入なし）'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black text-indigo-900 block mb-1">
                    4. 能動的試行 (Experimentation):
                  </label>
                  {isReflectionEditable ? (
                    <input
                      type="text"
                      value={userKolbReflections[effectiveTargetId]?.experiment ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserKolbReflections((prev) => ({
                          ...prev,
                          [effectiveTargetId]: { ...prev[effectiveTargetId], experiment: val },
                        }));
                        setIsSaveSuccess(false);
                      }}
                      placeholder="次回の看護で実際に試す行動計画..."
                      className="w-full text-xs p-2 rounded-lg border border-indigo-300 bg-white text-slate-900 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs font-medium text-indigo-950 bg-white p-2 rounded-lg border border-indigo-200">
                      {userKolbReflections[effectiveTargetId]?.experiment || '（記入なし）'}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/60">
                <InlineItemChat
                  title="概念化・実践に対する対話チャット"
                  messages={userKolbChats[effectiveTargetId]?.conceptExpComments || []}
                  onSendMessage={(text) => handleSendKolbComment('conceptExpComments', text)}
                  currentUser={currentUser}
                  placeholder={`${currentUser.name}として概念化・実践へのアドバイス・返信を入力...`}
                />
              </div>
            </div>
          </div>
        )}

        {/* 自動保存インジケーター & 即時手動保存エリア */}
        {isReflectionEditable && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/60">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold">
                {currentFormat.toUpperCase()} フォーマット
              </span>
              
              {autoSaveStatus === 'saving' ? (
                <span className="text-amber-800 bg-amber-100 border border-amber-300 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 animate-pulse shadow-2xs">
                  <span>⏳</span> 変更を自動保存中...
                </span>
              ) : autoSaveStatus === 'saved' ? (
                <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                  <span>⚡</span> リアルタイム自動保存済み {lastSavedTime && `(${lastSavedTime})`}
                </span>
              ) : (
                <span className="text-blue-800 bg-blue-100 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <span>✨</span> 自動保存対応
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSaveReflection) {
                  onSaveReflection();
                } else {
                  setIsSaveSuccess(true);
                  setTimeout(() => setIsSaveSuccess(false), 3000);
                }
              }}
              className="!px-4 !py-2 !bg-blue-600 hover:!bg-blue-700 !text-white !font-extrabold !text-xs !rounded-xl !shadow-md !transition-all !flex !items-center !gap-1.5 !cursor-pointer active:!scale-95 shrink-0"
            >
              <span>💾</span> 今すぐ手動保存
            </button>
          </div>
        )}

        {isSaveSuccess && (
          <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-xl animate-fade-in flex items-center gap-1.5">
            <span>✓</span> 振り返りを正常に保存しました！（ローカル＆クラウド同期完了）
          </div>
        )}
      </div>
    </section>
  );
};
