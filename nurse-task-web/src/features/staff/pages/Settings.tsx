import React, { useMemo } from 'react';
import { useTheme, THEME_CONFIGS, type AppTheme } from '../../../hooks/useTheme';
import { useTimelineStore } from '../../../stores/useTimelineStore';

export const Settings: React.FC = () => {
  const { theme, changeTheme } = useTheme();

  // 🎓 Zustandから OJT モード設定 State と看護師マスターデータを読み取り
  const isOjtMode = useTimelineStore((state) => state.isOjtMode);
  const menteeId = useTimelineStore((state) => state.menteeId);
  const setOjtMode = useTimelineStore((state) => state.setOjtMode);
  const setMenteeId = useTimelineStore((state) => state.setMenteeId);

  const nurseMaster = useTimelineStore((state) => state.nurseMaster || []);
  const nurses = useTimelineStore((state) => state.nurses || []);
  const currentUser = useTimelineStore((state) => state.currentUser);

  // 🎓 既存の登録済み通常看護師ユーザーから選択肢候補を動的に生成
  const menteeCandidates = useMemo(() => {
    const list: { id: string; name: string; team: string; experience?: string }[] = [];
    const seenIds = new Set<string>();

    const currentUserId = (currentUser?.nurse_id || currentUser?.staff_id || '').toLowerCase();

    // 1. nurseMaster（DB・Firestore登録看護師）から一般メンバー看護師を抽出
    nurseMaster.forEach((nm) => {
      const cleanId = (nm.nurse_id || '').trim();
      if (!cleanId || cleanId.toLowerCase() === currentUserId || nm.is_leader) return;
      if (!seenIds.has(cleanId.toLowerCase())) {
        seenIds.add(cleanId.toLowerCase());
        list.push({
          id: cleanId,
          name: nm.name || '看護師',
          team: nm.team || 'Aチーム',
        });
      }
    });

    // 2. nurses（病棟リアルタイム看護師データ）から抽出
    nurses.forEach((n) => {
      const cleanId = (n.nurse_id || '').trim();
      if (!cleanId || cleanId.toLowerCase() === currentUserId || n.is_leader) return;
      if (!seenIds.has(cleanId.toLowerCase())) {
        seenIds.add(cleanId.toLowerCase());
        list.push({
          id: cleanId,
          name: n.name || '看護師',
          team: n.team || 'Aチーム',
        });
      }
    });

    // 3. システム標準の登録済み通常看護師アカウントを追加（重複排除付き）
    const defaultKnownNurses = [
      { id: 'nurse05', name: '田中 結衣', experience: '1年目', team: 'Aチーム' },
      { id: 'n002', name: '田中 結衣', experience: '1年目', team: 'Aチーム' },
      { id: 'nurse02', name: '佐藤 看護師', experience: '1年目', team: 'Aチーム' },
      { id: 'n003', name: '佐藤 看護師', experience: '1年目', team: 'Aチーム' },
      { id: 'nurse03', name: '鈴木 看護師', experience: '2年目', team: 'Bチーム' },
      { id: 'n004', name: '鈴木 看護師', experience: '2年目', team: 'Bチーム' },
      { id: 'nurse04', name: '高橋 看護師', experience: '1年目', team: 'Bチーム' },
      { id: 'n005', name: '高橋 看護師', experience: '1年目', team: 'Bチーム' },
    ];

    defaultKnownNurses.forEach((dk) => {
      if (!seenIds.has(dk.id.toLowerCase())) {
        seenIds.add(dk.id.toLowerCase());
        list.push(dk);
      }
    });

    return list;
  }, [nurseMaster, nurses, currentUser]);

  // 選択中の新人オブジェクト（ケースインセンシティブID名寄せ対応）
  const selectedMentee = useMemo(() => {
    if (!menteeId) return menteeCandidates[0] || null;
    const target = menteeId.trim().toLowerCase();
    return (
      menteeCandidates.find(
        (m) =>
          m.id.toLowerCase() === target ||
          (target === 'n002' && m.id === 'nurse05') ||
          (target === 'nurse05' && m.id === 'n002') ||
          (target === 'n003' && m.id === 'nurse02') ||
          (target === 'nurse02' && m.id === 'n003') ||
          (target === 'n004' && m.id === 'nurse03') ||
          (target === 'nurse03' && m.id === 'n004') ||
          (target === 'n005' && m.id === 'nurse04') ||
          (target === 'nurse04' && m.id === 'n005')
      ) || menteeCandidates[0]
    );
  }, [menteeCandidates, menteeId]);

  const menteeDisplayName = selectedMentee
    ? `${selectedMentee.name} (${selectedMentee.team}${selectedMentee.experience ? `・${selectedMentee.experience}` : ''})`
    : '未選択';

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* ページのタイトルヘッダー */}
        <div id="settings-header" className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-gray-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-indigo-50 rounded-xl">⚙️</span>
            <div className="text-left">
              <h1 className="text-xl font-extrabold text-gray-900">システム設定</h1>
              <p className="text-xs text-gray-500 font-medium">
                看護環境に応じたテーマ設定や、指導者向けのOJT画面共有・端末通知を設定します。
              </p>
            </div>
          </div>
        </div>

        {/* 🎓 OJT（新人指導）連携設定セクション */}
        <div id="settings-ojt-sharing" className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-gray-200/80 text-left">
          <div className="mb-5">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span>🎓 OJT（新人指導）連携設定</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                プリセプター・新人画面共有モード
              </span>
            </h2>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              指導者（プリセプター）が担当新人のタイムライン画面をリアルタイム並列表示（ペア画面）し、タスクの進捗状況やサポートが必要なケアを常時追跡・指導できます。
            </p>
          </div>

          <div className="flex flex-col gap-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
            {/* 1. 画面共有モード (ON/OFF トグル) */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>🖥️ 画面共有モード (ペア表示)</span>
                  {isOjtMode ? (
                    <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-md shadow-2xs">
                      ON (並列表示中)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                      OFF (単体表示中)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  タイムライン画面で自分のタスクと担当新人のタスクを分割して並列表示します。
                </p>
              </div>

              {/* トグルスイッチ */}
              <button
                type="button"
                onClick={() => setOjtMode(!isOjtMode)}
                className={`!relative !inline-flex !h-7 !w-13 !flex-shrink-0 !cursor-pointer !rounded-full !border-2 !border-transparent !transition-colors !duration-200 !ease-in-out focus:!outline-none ${
                  isOjtMode ? '!bg-emerald-500' : '!bg-slate-300'
                }`}
                role="switch"
                aria-checked={isOjtMode}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isOjtMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. 担当新人の選択 (画面共有モードONの時だけ表示) */}
            {isOjtMode && (
              <div className="pt-4 border-t border-slate-200/80 animate-fade-in">
                <label htmlFor="mentee-select" className="block text-xs font-extrabold text-slate-700 mb-2">
                  🌱 担当新人看護師の選択（実存の登録看護師ユーザー）
                </label>
                <div className="relative max-w-md">
                  <select
                    id="mentee-select"
                    value={selectedMentee ? selectedMentee.id : ''}
                    onChange={(e) => setMenteeId(e.target.value || null)}
                    className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl p-3 pr-10 shadow-xs focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                  >
                    {menteeCandidates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.team}{m.experience ? `・${m.experience}` : ''})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 text-xs">
                    ▼
                  </div>
                </div>
                <p className="text-[11px] text-emerald-800 font-bold mt-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  選択中の新人: <span className="underline font-black">{menteeDisplayName}</span> さんのタイムラインが並列表示されます
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 🎨 カラーパレット（テーマ）選択セクション */}
        <div id="settings-theme-selector" className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-gray-200/80 text-left">
          <div className="mb-6">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span>🎨 視覚心理カラーテーマ</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                臨床環境最適化
              </span>
            </h2>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              部署の特性や時間帯（夜勤・巡視など）に合わせて視覚心理に基づいた3つのカラーパレットを即座に切り替えられます。
            </p>
          </div>

          {/* 3つのテーマ選択カードグリッド */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(Object.keys(THEME_CONFIGS) as AppTheme[]).map((key) => {
              const config = THEME_CONFIGS[key];
              const isSelected = theme === key;

              return (
                <div
                  key={key}
                  onClick={() => changeTheme(key)}
                  className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {/* アクティブ判定バッジ */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <span>✓ 選択中</span>
                    </div>
                  )}

                  <div>
                    {/* テーマ名 & サブタイトル */}
                    <div className="mb-3 pr-12">
                      <h3 className="font-extrabold text-base text-gray-900">{config.name}</h3>
                      <span className="text-[11px] font-bold text-gray-500 block mt-0.5">
                        {config.subtitle}
                      </span>
                    </div>

                    {/* カラーパレット・ミニプレビューバー */}
                    <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className="w-full h-6 rounded-lg shadow-xs"
                          style={{ backgroundColor: config.mainColor }}
                        />
                        <span className="text-[9px] font-bold text-gray-500 mt-1">メイン</span>
                      </div>

                      <div className="flex flex-col items-center flex-1">
                        <div
                          className="w-full h-6 rounded-lg shadow-xs"
                          style={{ backgroundColor: config.accentColor }}
                        />
                        <span className="text-[9px] font-bold text-gray-500 mt-1">アクセント</span>
                      </div>

                      <div className="flex flex-col items-center flex-1">
                        <div
                          className="w-full h-6 rounded-lg shadow-xs border border-gray-200"
                          style={{ backgroundColor: config.bgColor }}
                        />
                        <span className="text-[9px] font-bold text-gray-500 mt-1">背景</span>
                      </div>
                    </div>

                    {/* 視覚効果・推奨病棟説明文 */}
                    <p className="text-xs text-gray-600 font-normal leading-relaxed mb-4">
                      {config.description}
                    </p>
                  </div>

                  {/* 推奨病棟・ユニットタグ */}
                  <div className="pt-3 border-t border-gray-100 text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                    <span>🏥</span>
                    <span className="truncate">{config.targetUnit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 📲 SOS / エリア接近 Web Push 通知設定セクション */}
        <div id="settings-push-notification" className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-gray-200/80 text-left">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>📲 SOS & 緊急通知 (Web Push)</span>
                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                  端末連携・リアルタイムアラート
                </span>
              </h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                看護師SOS・タスクSOS・患者SOS発生時に、ブラウザやスマホOS本体へ即時にネイティブ通知バナー・アラーム音・バイブレーションを発行します。
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const { requestNotificationPermission } = await import('../../../utils/notification');
                  const perm = await requestNotificationPermission();
                  if (perm === 'granted') {
                    alert('✅ 通知が許可されています！');
                  } else {
                    alert('⚠️ ブラウザの設定で通知が許可されていません');
                  }
                }}
                className="!bg-indigo-50 hover:!bg-indigo-100 !text-indigo-700 !font-extrabold !text-xs !px-3 !py-2 !rounded-xl !border !border-indigo-200 !shadow-xs !cursor-pointer"
              >
                🔔 通知許可を確認
              </button>

              <button
                type="button"
                onClick={async () => {
                  const { sendNativePushNotification } = await import('../../../utils/notification');
                  sendNativePushNotification('🚨 【テストSOS】緊急アシスト要請', {
                    body: 'これはSOSプッシュ通知のテストです。アラーム音とバイブレーションが発動します。',
                    tag: 'test-sos-notification',
                    playSound: true,
                    requireInteraction: true,
                  });
                }}
                className="!bg-rose-600 hover:!bg-rose-700 !text-white !font-black !text-xs !px-4 !py-2 !rounded-xl !shadow-md hover:!shadow-lg !transition-all !cursor-pointer flex items-center gap-1.5"
              >
                <span>🚨 プッシュ通知テスト発信</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold">端末プッシュ通知機能:</span>
              <span className="text-slate-600">画面がバックグラウンド時や他タブ閲覧中もOS通知でお知らせします</span>
            </div>
            <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-bold">
              Permission: {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'}
            </span>
          </div>
        </div>

        {/* 💡 補足説明カード */}
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-5 text-left flex items-start gap-3">
          <span className="text-xl p-2 bg-indigo-100 rounded-xl">💡</span>
          <div className="text-xs text-indigo-950 font-medium leading-relaxed">
            <h4 className="font-extrabold text-sm mb-1 text-indigo-900">設定の自動保存について</h4>
            <p>
              変更されたOJT画面共有モードやカラーテーマ設定はブラウザ内 (`localStorage`) に即座に保存されます。ページ更新や再ログイン時にも前回の設定値が自動的に読み込まれます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
