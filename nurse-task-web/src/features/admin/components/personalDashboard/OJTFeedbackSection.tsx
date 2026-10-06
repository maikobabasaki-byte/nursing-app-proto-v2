import React, { useState, useEffect } from 'react';
import type { UserRoleInfo } from '../../types/personalDashboard';

export interface OJTFeedbackData {
  clarityRating: number; // 指示の明確さ (1〜5)
  psychologicalSafetyRating: number; // 質問のしやすさ (1〜5)
  thanksMessage: string;
  senderName: string;
  senderAvatarEmoji: string;
  submittedAt?: string;
  isSubmitted: boolean;
}

export interface PreceptorKPTData {
  keep: string;
  problem: string;
  try: string;
  updatedAt?: string;
}

interface OJTFeedbackSectionProps {
  currentUser: UserRoleInfo;
  effectiveTargetId: string;
  isViewingSelf?: boolean;
  preceptorName?: string;
  nurseName?: string;
  ojtFeedback: OJTFeedbackData;
  preceptorKpt: PreceptorKPTData;
  onSubmitOJTFeedback: (data: OJTFeedbackData) => void;
  onSavePreceptorKPT: (kpt: PreceptorKPTData) => void;
  isTargetMentee?: boolean;
}

export const OJTFeedbackSection: React.FC<OJTFeedbackSectionProps> = ({
  currentUser,
  effectiveTargetId,
  isViewingSelf = true,
  preceptorName = '鈴木 プリセプター',
  nurseName = '田中 結衣',
  ojtFeedback,
  preceptorKpt,
  onSubmitOJTFeedback,
  onSavePreceptorKPT,
  isTargetMentee,
}) => {
  const isTargetMenteeResolved = typeof isTargetMentee === 'boolean'
    ? isTargetMentee
    : (effectiveTargetId === 'N002' || effectiveTargetId === 'N004' || effectiveTargetId === 'N005' || effectiveTargetId.includes('nurse02') || effectiveTargetId.includes('nurse04') || effectiveTargetId.includes('nurse05'));

  const isPreceptorOrAdmin = currentUser.role === 'admin' || currentUser.role === 'preceptor';
  const canEditNurseThanksCard = isTargetMenteeResolved && !isPreceptorOrAdmin && isViewingSelf;
  const canEditPreceptorKPT = !isTargetMenteeResolved && (currentUser.role === 'preceptor' || currentUser.role === 'admin');

  // 新人側 State
  const [clarity, setClarity] = useState<number>(ojtFeedback.clarityRating || 4);
  const [psychSafety, setPsychSafety] = useState<number>(ojtFeedback.psychologicalSafetyRating || 5);
  const [message, setMessage] = useState<string>(
    ojtFeedback.thanksMessage ||
      '本日は気管吸引と静脈採血のフォローありがとうございました！事前に重要なポイントを3つ教えていただいたおかげで落ち着いて実施できました。明日もよろしくお願いします！'
  );
  const [isEditingNurseForm, setIsEditingNurseForm] = useState<boolean>(!ojtFeedback.isSubmitted);

  // 指導者KPT State
  const [keepText, setKeepText] = useState<string>(
    preceptorKpt.keep ||
      '処置前にチェックリストを用いて手順のポイントを3点共有できた。新人ナースが焦らず確認しながら動けていた。'
  );
  const [problemText, setProblemText] = useState<string>(
    preceptorKpt.problem ||
      '午後の急変タスクが入った際、申し送りの指示がやや早口になってしまい、確認の質問を受け受ける余白が少なかった。'
  );
  const [tryText, setTryText] = useState<string>(
    preceptorKpt.try ||
      '明日は処置開始前5分間の「質問タイム」をあらかじめタイムスケジュールに組み込み、心理的安全性を高める。'
  );
  const [kptSavedNotice, setKptSavedNotice] = useState<boolean>(false);

  // React to prop changes if target staff changes
  useEffect(() => {
    setClarity(ojtFeedback.clarityRating || 4);
    setPsychSafety(ojtFeedback.psychologicalSafetyRating || 5);
    if (ojtFeedback.thanksMessage) setMessage(ojtFeedback.thanksMessage);
    setIsEditingNurseForm(!ojtFeedback.isSubmitted);
  }, [ojtFeedback, effectiveTargetId]);

  useEffect(() => {
    setKeepText(
      preceptorKpt.keep ||
        '処置前にチェックリストを用いて手順のポイントを3点共有できた。新人ナースが焦らず確認しながら動けていた。'
    );
    setProblemText(
      preceptorKpt.problem ||
        '午後の急変タスクが入った際、申し送りの指示がやや早口になってしまい、確認の質問を受け受ける余白が少なかった。'
    );
    setTryText(
      preceptorKpt.try ||
        '明日は処置開始前5分間の「質問タイム」をあらかじめタイムスケジュールに組み込み、心理的安全性を高める。'
    );
  }, [preceptorKpt, effectiveTargetId]);

  // サンクスカード送信処理
  const handleNurseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData: OJTFeedbackData = {
      clarityRating: clarity,
      psychologicalSafetyRating: psychSafety,
      thanksMessage: message,
      senderName: currentUser.name || nurseName,
      senderAvatarEmoji: '🌱',
      submittedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      isSubmitted: true,
    };
    onSubmitOJTFeedback(updatedData);
    setIsEditingNurseForm(false);
  };

  // 教育KPT保存処理
  const handleKPTSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedKpt: PreceptorKPTData = {
      keep: keepText,
      problem: problemText,
      try: tryText,
      updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };
    onSavePreceptorKPT(updatedKpt);
    setKptSavedNotice(true);
    setTimeout(() => setKptSavedNotice(false), 3000);
  };

  // 星評価レンダラー (インタラクティブ)
  const renderInteractiveStars = (val: number, setVal: (n: number) => void) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setVal(star)}
          className={`text-2xl transition-transform cursor-pointer hover:scale-125 focus:outline-none ${
            star <= val ? 'text-amber-400 drop-shadow-xs' : 'text-slate-300 hover:text-amber-200'
          }`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-xs font-black text-amber-900 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-md">
        {val} / 5
      </span>
    </div>
  );

  // 星評価レンダラー (閲覧専用)
  const renderReadOnlyStars = (val: number) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-lg ${star <= val ? 'text-amber-400 drop-shadow-xs' : 'text-slate-200'}`}
        >
          ★
        </span>
      ))}
      <span className="ml-1.5 text-xs font-black text-amber-900 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-md">
        {val} / 5
      </span>
    </div>
  );

  return (
    <section className="bg-gradient-to-br from-rose-50/80 via-orange-50/50 to-amber-50/80 p-4 lg:p-6 rounded-2xl shadow-sm border-2 border-rose-200/90 flex flex-col gap-5">
      {/* ---------------- 1. 新人ナース向け UI（サンクスカード受講・送信用） ---------------- */}
      {isTargetMenteeResolved ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
            <div>
              <h3 className="text-base lg:text-lg font-extrabold text-rose-950 flex items-center gap-2">
                <span className="text-xl">💌</span> 本日の指導へのフィードバック（サンクスカード）
              </h3>
              <p className="text-xs text-rose-800 font-medium mt-0.5">
                担当指導者（{preceptorName}）へ本日の指導の感謝や心理的安全性のフィードバックを送りましょう
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-rose-900 bg-rose-100 border border-rose-300 px-3 py-1 rounded-xl flex items-center gap-1">
                <span>🤝</span> ペア指導者: {preceptorName}
              </span>
            </div>
          </div>

          {(ojtFeedback.isSubmitted || !canEditNurseThanksCard) && !isEditingNurseForm ? (
            /* 送信完了後の美しいプレビュー表示 */
            <div className="bg-white/90 p-4 rounded-xl border border-rose-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  <span>✨</span> 本日のサンクスカード ({ojtFeedback.isSubmitted ? `送信完了 ${ojtFeedback.submittedAt || '16:30'}` : '閲覧専用'})
                </div>
                {canEditNurseThanksCard && (
                  <button
                    type="button"
                    onClick={() => setIsEditingNurseForm(true)}
                    className="!text-xs !font-extrabold !text-rose-700 hover:!text-rose-900 !flex !items-center !gap-1 !cursor-pointer"
                  >
                    <span>✏️</span> 送信内容を修正する
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-rose-50/50 p-3 rounded-lg border border-rose-100">
                <div>
                  <span className="text-xs font-extrabold text-slate-700 block mb-1">
                    🎯 指示の明確さ（わかりやすかったか）:
                  </span>
                  {renderReadOnlyStars(ojtFeedback.clarityRating)}
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-700 block mb-1">
                    💬 質問のしやすさ（心理的安全性）:
                  </span>
                  {renderReadOnlyStars(ojtFeedback.psychologicalSafetyRating)}
                </div>
              </div>

              <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200">
                <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1 mb-1">
                  <span>💖</span> 今日の感謝・メッセージ:
                </span>
                <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {ojtFeedback.thanksMessage}
                </p>
              </div>
            </div>
          ) : (
            /* 入力フォーム */
            <form onSubmit={handleNurseSubmit} className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-rose-50/60 p-3.5 rounded-xl border border-rose-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-rose-950 block">
                    🎯 指示の明確さ（指示・説明はわかりやすかったですか？）
                  </label>
                  {renderInteractiveStars(clarity, setClarity)}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-rose-950 block">
                    💬 質問のしやすさ（疑問点や不安を話しかけやすかったですか？）
                  </label>
                  {renderInteractiveStars(psychSafety, setPsychSafety)}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="thanks-message-input" className="text-xs font-extrabold text-rose-950 flex items-center gap-1">
                  <span>💖</span> 今日の感謝・メッセージ（プリセプター・指導者へ）
                </label>
                <textarea
                  id="thanks-message-input"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="例: 本日は多忙な時間帯にも関わらず、丁寧に採血の手順をフォローいただきありがとうございました！"
                  className="w-full p-3 text-xs font-medium text-slate-800 bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                {ojtFeedback.isSubmitted && (
                  <button
                    type="button"
                    onClick={() => setIsEditingNurseForm(false)}
                    className="px-4 py-2 text-xs font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-all cursor-pointer"
                  >
                    キャンセル
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-sm border border-rose-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>💌</span> 指導者へサンクスカードを送信
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* ---------------- 2. 指導者（プリセプター・師長）向け UI ---------------- */
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
            <div>
              <h3 className="text-base lg:text-lg font-extrabold text-rose-950 flex items-center gap-2">
                <span className="text-xl">🎓</span> OJTペア指導振り返り & 新人からのサンクスカード
              </h3>
              <p className="text-xs text-rose-800 font-medium mt-0.5">
                担当新人（{nurseName}）からのサンクスカード受信 ＆ 指導スキルの教育用KPT
              </p>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl flex items-center gap-1 shrink-0">
              <span>🌱</span> 担当新人: {nurseName}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 左カラム: 新人からのフィードバック受信 (lg:col-span-5) */}
            <div className="lg:col-span-5 bg-white/95 p-4 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                <h4 className="text-xs lg:text-sm font-extrabold text-rose-950 flex items-center gap-1.5">
                  <span>💌</span> 新人（{nurseName}）からのサンクスカード
                </h4>
                <span className="text-[10px] font-extrabold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {ojtFeedback.isSubmitted ? '受信済み' : '受信中...'}
                </span>
              </div>

              {ojtFeedback.isSubmitted ? (
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="bg-gradient-to-r from-rose-50 to-amber-50 p-3 rounded-xl border border-rose-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800">🎯 指示の明確さ:</span>
                      {renderReadOnlyStars(ojtFeedback.clarityRating)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800">💬 質問のしやすさ:</span>
                      {renderReadOnlyStars(ojtFeedback.psychologicalSafetyRating)}
                    </div>
                  </div>

                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1 mb-1">
                        <span>💖</span> 新人からのメッセージ:
                      </span>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                        「{ojtFeedback.thanksMessage}」
                      </p>
                    </div>
                    <div className="text-[10px] font-bold text-amber-800 text-right mt-2">
                      送信日時: {ojtFeedback.submittedAt || '本日 16:30'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50/50 p-4 rounded-xl border border-dashed border-rose-300 text-center flex flex-col items-center justify-center gap-2 flex-1 min-h-[160px]">
                  <span className="text-2xl animate-pulse">💌</span>
                  <span className="text-xs font-extrabold text-rose-900">
                    本日のサンクスカード受信待ちです
                  </span>
                  <p className="text-[11px] text-rose-700 font-medium">
                    新人ナースが指導フィードバック・感謝メッセージを入力するとここに表示されます。
                  </p>
                </div>
              )}
            </div>

            {/* 右カラム: 教育用KPTフォーム (lg:col-span-7) */}
            <form onSubmit={handleKPTSave} className="lg:col-span-7 bg-white p-4 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                <h4 className="text-xs lg:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>📝</span> 指導スキルの教育用KPT（自身の指導振り返り）
                </h4>
                {canEditPreceptorKPT ? (
                  <button
                    type="submit"
                    className="!bg-indigo-600 hover:!bg-indigo-700 !text-white !font-extrabold !text-xs !px-3.5 !py-1 !rounded-lg !shadow-2xs !border !border-indigo-800 !transition-all !flex !items-center !gap-1 !cursor-pointer active:!scale-95"
                  >
                    <span>💾</span> KPTを保存
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                    <span>🔒</span> 閲覧専用 (プリセプターのみ入力可能)
                  </span>
                )}
              </div>

              {kptSavedNotice && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-extrabold p-2 rounded-lg animate-fade-in flex items-center gap-1.5">
                  <span>✨</span> 指導スキルの教育用KPTを保存しました。
                </div>
              )}

              <div className="space-y-2.5">
                {/* Keep */}
                <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                  <label htmlFor="kpt-keep-input" className="text-xs font-extrabold text-emerald-900 flex items-center gap-1 mb-1">
                    <span>💪</span> Keep（本日良かった指導・継続すること）
                  </label>
                  <textarea
                    id="kpt-keep-input"
                    rows={2}
                    value={keepText}
                    onChange={(e) => setKeepText(e.target.value)}
                    disabled={!canEditPreceptorKPT}
                    placeholder="例: 事前にチェックリストで重要手順を3つ絞って説明した。"
                    className={`w-full p-2 text-xs font-medium text-slate-800 bg-white border border-emerald-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none placeholder:text-slate-400 ${
                      !canEditPreceptorKPT ? '!bg-slate-100 !text-slate-600 !border-slate-300 !cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                {/* Problem */}
                <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                  <label htmlFor="kpt-problem-input" className="text-xs font-extrabold text-amber-900 flex items-center gap-1 mb-1">
                    <span>⚠️</span> Problem（指導の反省点・改善を要する点）
                  </label>
                  <textarea
                    id="kpt-problem-input"
                    rows={2}
                    value={problemText}
                    onChange={(e) => setProblemText(e.target.value)}
                    disabled={!canEditPreceptorKPT}
                    placeholder="例: 緊急割り込み対応時、指示がやや早口になってしまった。"
                    className={`w-full p-2 text-xs font-medium text-slate-800 bg-white border border-amber-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none placeholder:text-slate-400 ${
                      !canEditPreceptorKPT ? '!bg-slate-100 !text-slate-600 !border-slate-300 !cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                {/* Try */}
                <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                  <label htmlFor="kpt-try-input" className="text-xs font-extrabold text-blue-900 flex items-center gap-1 mb-1">
                    <span>🚀</span> Try（明日の指導で新しく試すこと）
                  </label>
                  <textarea
                    id="kpt-try-input"
                    rows={2}
                    value={tryText}
                    onChange={(e) => setTryText(e.target.value)}
                    disabled={!canEditPreceptorKPT}
                    placeholder="例: 処置開始前5分間に確認・質問タイムをあらかじめ設定する。"
                    className={`w-full p-2 text-xs font-medium text-slate-800 bg-white border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder:text-slate-400 ${
                      !canEditPreceptorKPT ? '!bg-slate-100 !text-slate-600 !border-slate-300 !cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
