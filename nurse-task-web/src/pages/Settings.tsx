import React from 'react';
import { useTheme, THEME_CONFIGS, type AppTheme } from '../hooks/useTheme';

export const Settings: React.FC = () => {
  const { theme, changeTheme } = useTheme();

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
                看護環境や勤務帯に応じた最適なテーマ（カラーパレット）を設定します。
              </p>
            </div>
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
                  const { requestNotificationPermission } = await import('../utils/notification');
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
                  const { sendNativePushNotification } = await import('../utils/notification');
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
            <h4 className="font-extrabold text-sm mb-1 text-indigo-900">テーマ設定の自動保存について</h4>
            <p>
              選択されたカラーテーマはブラウザ内 (`localStorage`) に即座に保存されます。ページを更新・再ログインした場合でも設定したカラー環境が自動的に引き継がれます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
