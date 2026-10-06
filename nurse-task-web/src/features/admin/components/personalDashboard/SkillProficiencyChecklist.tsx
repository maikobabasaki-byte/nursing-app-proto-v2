import React from 'react';
import type { UserRoleInfo } from '../../types/personalDashboard';

export interface NursingSkillItem {
  id: string;
  name: string;
  category: string;
  level: number; // 1〜5
}

export const SKILL_LEVEL_DEFINITIONS: Record<
  number,
  { label: string; desc: string; activeBg: string; textCol: string; borderCol: string }
> = {
  1: {
    label: '見学',
    desc: 'Lv.1: 見学レベル（知識のみ、未実施）',
    activeBg: '!bg-slate-500',
    textCol: '!text-white',
    borderCol: '!border-slate-600',
  },
  2: {
    label: 'ほぼ支援',
    desc: 'Lv.2: ほぼ支援が必要なレベル',
    activeBg: '!bg-red-500',
    textCol: '!text-white',
    borderCol: '!border-red-600',
  },
  3: {
    label: '一部支援',
    desc: 'Lv.3: 一部支援が必要なレベル',
    activeBg: '!bg-amber-500',
    textCol: '!text-white',
    borderCol: '!border-amber-600',
  },
  4: {
    label: '見守り',
    desc: 'Lv.4: 見守りレベル（手は出さず確認のみ）',
    activeBg: '!bg-lime-500',
    textCol: '!text-white',
    borderCol: '!border-lime-600',
  },
  5: {
    label: '独り立ち',
    desc: 'Lv.5: 独り立ち可能なレベル（自立）',
    activeBg: '!bg-emerald-600',
    textCol: '!text-white',
    borderCol: '!border-emerald-700',
  },
};

interface SkillProficiencyChecklistProps {
  currentUser: UserRoleInfo;
  skills: NursingSkillItem[];
  onUpdateSkillLevel: (skillId: string, skillName: string, newLevel: number) => void;
  isViewingSelf?: boolean;
  staffName?: string;
  isTargetMentee?: boolean;
  menteeName?: string;
}

export const SkillProficiencyChecklist: React.FC<SkillProficiencyChecklistProps> = ({
  currentUser,
  skills,
  onUpdateSkillLevel,
  isViewingSelf = false,
  staffName = '',
  isTargetMentee = true,
  menteeName = '田中 結衣',
}) => {
  const isTargetPreceptor = !isTargetMentee;
  const targetMenteeDisplayName = isTargetPreceptor ? menteeName : (staffName || '対象看護師');

  // 指導者（プリセプター / 師長）が入力可能
  const isInstructor = (currentUser.role === 'admin' || currentUser.role === 'preceptor') && (!isViewingSelf || isTargetPreceptor);
  const canEditLevel = isInstructor;

  return (
    <section className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
      {/* タイトル & レベル定義凡例 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base lg:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span className="text-xl">💉</span> 看護技術 習熟度（自立度）チェックリスト
            </h3>
            <span className="text-xs font-black text-emerald-950 bg-emerald-100/90 border border-emerald-300 px-3 py-1 rounded-xl shadow-2xs flex items-center gap-1">
              <span>🌱</span> 評価対象新人: <strong>{targetMenteeDisplayName}</strong> ナース
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1">
            {isTargetPreceptor
              ? `指導プリセプター（${staffName}）として、担当新人「${targetMenteeDisplayName}」の看護技術自立度（Lv.1〜5）を評価・更新します。`
              : `新人ナース「${targetMenteeDisplayName}」のOJT現場における具体的な看護技術の5段階（自立度）評価結果です。`}
          </p>
        </div>

        {/* 権限状態バッジ */}
        <div>
          {canEditLevel ? (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1 shadow-2xs">
              <span>✏️</span> 指導者評価・レベル更新モード
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 flex items-center gap-1">
              <span>🔒</span> 閲覧専用モード（指導者のみレベル入力可能・本人は閲覧のみ）
            </span>
          )}
        </div>
      </div>

      {isTargetPreceptor && (
        <div className="bg-amber-50/90 border border-amber-200/90 text-amber-950 p-3 rounded-xl text-xs font-medium flex items-center gap-2 shadow-2xs animate-fade-in">
          <span className="text-xl">💡</span>
          <div>
            <strong>【OJT指導表示メモ】</strong> プリセプター（{staffName}）本人の技術評価ではなく、指導担当している<strong>新人ナース「{targetMenteeDisplayName}」</strong>の看護技術習熟度を表示・指導評価しています。
          </div>
        </div>
      )}

      {/* 5段階レベル定義の凡例バー */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        {([1, 2, 3, 4, 5] as const).map((lvl) => {
          const def = SKILL_LEVEL_DEFINITIONS[lvl];
          return (
            <div key={lvl} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200">
              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${def.activeBg}`} />
              <div className="truncate">
                <span className="font-extrabold text-[11px] text-slate-800">Lv.{lvl} {def.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 技術習熟度リスト */}
      <div className="space-y-2.5">
        {skills.map((skill) => {
          const currentDef = SKILL_LEVEL_DEFINITIONS[skill.level] || SKILL_LEVEL_DEFINITIONS[1];

          return (
            <div
              key={skill.id}
              className="p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* 左側: カテゴリ & 技術名 & 現在のレベルバッジ */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-extrabold text-blue-900 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded shrink-0">
                  {skill.category}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                  {skill.name}
                </span>
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-md border shrink-0 ${currentDef.activeBg} ${currentDef.textCol} ${currentDef.borderCol}`}
                >
                  Lv.{skill.level} {currentDef.label}
                </span>
              </div>

              {/* 右側: 5段階ステップ式インジケーター */}
              <div className="flex items-center gap-1.5 shrink-0">
                {([1, 2, 3, 4, 5] as const).map((stepVal) => {
                  const stepDef = SKILL_LEVEL_DEFINITIONS[stepVal];
                  const isReached = stepVal <= skill.level;

                  return (
                    <button
                      key={stepVal}
                      type="button"
                      disabled={!isInstructor}
                      onClick={() => isInstructor && onUpdateSkillLevel(skill.id, skill.name, stepVal)}
                      title={`${stepDef.desc} ${isInstructor ? '（クリックでこのレベルに更新）' : '（指導者のみ入力可能・閲覧モード）'}`}
                      className={`!h-7 !px-2.5 !rounded-lg !font-black !transition-all !flex !items-center !justify-center !gap-1 !border disabled:opacity-100 ${
                        isInstructor
                          ? `cursor-pointer active:scale-95 ${
                              isReached
                                ? `${stepDef.activeBg} ${stepDef.textCol} ${stepDef.borderCol} hover:brightness-110 !shadow-2xs`
                                : '!bg-slate-200/80 !text-slate-400 !border-slate-300 hover:!bg-slate-300'
                            }`
                          : `cursor-default ${
                              isReached
                                ? `${stepDef.activeBg} ${stepDef.textCol} ${stepDef.borderCol} !shadow-2xs`
                                : '!bg-slate-200/80 !text-slate-400 !border-slate-300'
                            }`
                      }`}
                    >
                      <span>{stepVal}</span>
                      <span className="text-[9px] font-bold hidden md:inline">{stepDef.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
