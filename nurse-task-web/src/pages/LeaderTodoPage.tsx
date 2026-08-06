import React, { useState, useEffect, useMemo } from 'react';
import { useTimelineStore } from '../stores/useTimelineStore';
import type { LeaderTodo, LeaderTodoPriority } from '../types/types';
import { LeaderTodoModal } from '../components/LeaderTodoModal';
import { LeaderTodoResultModal } from '../components/LeaderTodoResultModal';
import { calculateLeaderTodoProgress } from '../utils/progressCalculator';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PatientItem {
  patient_id: string;
  name: string;
  room_id: string;
  gender?: string;
}

export const LeaderTodoPage: React.FC = () => {
  const leaderTodos = useTimelineStore((state) => state.leaderTodos);
  const setLeaderTodos = useTimelineStore((state) => state.setLeaderTodos);
  const currentUser = useTimelineStore((state) => state.currentUser);

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [selectedPatientForModal, setSelectedPatientForModal] = useState<{
    patient_id: string;
    name: string;
    room_id: string;
  } | null>(null);

  const [editingTodo, setEditingTodo] = useState<LeaderTodo | null>(null);
  const [resultModalTodo, setResultModalTodo] = useState<LeaderTodo | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all'); // all | urgent | high | medium

  // Firestoreの leader_todos コレクションをリアルタイム監視（論理削除済みを除外）
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'leader_todos'), 
      (snapshot) => {
        const todos = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              todo_id: doc.id,
              ...data,
            } as LeaderTodo;
          })
          .filter((t) => !t.is_deleted && t.status !== 'deleted');
        setLeaderTodos(todos);
      },
      (error) => {
        if (error.code === 'resource-exhausted') {
          console.warn("⚠️ [LeaderTodo] Firestoreのクォータ上限に到達しました。");
        } else {
          console.error("LeaderTodo リアルタイム取得エラー:", error);
        }
      }
    );
    return () => unsubscribe();
  }, [setLeaderTodos]);

  // 患者マスター一覧の取得
  useEffect(() => {
    fetch('/data/patients.json')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.patients || [];
        setPatients(
          list.map((p: any) => ({
            patient_id: p.patient_id || String(p.id),
            name: p.name || p.patient_name || '患者',
            room_id: p.room_id || String(p.room || '000'),
            gender: p.gender,
          }))
        );
      })
      .catch((err) => console.error('患者マスター取得エラー:', err));
  }, []);

  // 💡 時刻文字列 (14:00 や ISO 形式) を数値（分）に変換するヘルパー関数
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 9999;
    const str = String(timeStr).trim();
    const match = str.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    if (match) {
      const hh = parseInt(match[1], 10);
      const mm = parseInt(match[2], 10);
      return hh * 60 + mm;
    }
    return 9999; // 時間指定なしや随時はリストの末尾にソート
  };

  // 💡 ログインユーザー自身の全非削除TODO
  const allMyTodos = useMemo(() => {
    let list = leaderTodos.filter((t) => !t.is_deleted && t.status !== 'deleted');

    if (currentUser) {
      list = list.filter((t) => {
        if (t.nurse_id || t.user_id) {
          return t.nurse_id === currentUser.nurse_id || 
                 t.user_id === currentUser.nurse_id || 
                 t.nurse_id === currentUser.email || 
                 t.user_id === currentUser.email;
        }
        return t.updated_by === currentUser.name;
      });
    }

    if (filterPriority !== 'all') {
      list = list.filter((t) => t.priority === filterPriority);
    }

    return list.sort((a, b) => {
      const timeA = parseTimeToMinutes(a.scheduled_at);
      const timeB = parseTimeToMinutes(b.scheduled_at);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return (a.scheduled_at || '').localeCompare(b.scheduled_at || '');
    });
  }, [leaderTodos, filterPriority, currentUser]);

  // 🎯 中央カラム用: 未対応・進行中・保留中TODOリスト
  const activeTodos = useMemo(() => {
    return allMyTodos.filter((t) => t.status !== 'completed');
  }, [allMyTodos]);

  // 🎯 右カラム用: 本日対応済み（完了・結果記録済み）TODOリスト
  const completedTodos = useMemo(() => {
    return allMyTodos.filter((t) => t.status === 'completed' || (t.result_outcome && t.result_outcome.trim() !== ''));
  }, [allMyTodos]);

  // 📊 タイムライン計画時間を加味した進捗率算出
  const progressStats = useMemo(() => {
    return calculateLeaderTodoProgress(allMyTodos);
  }, [allMyTodos]);



  // 💡 削除されたTODOが選択されていた場合、右カラム選択を自動クリア
  useEffect(() => {
    if (selectedTodoId) {
      const exists = leaderTodos.some(t => t.todo_id === selectedTodoId && !t.is_deleted && t.status !== 'deleted');
      if (!exists) {
        setSelectedTodoId(null);
      }
    }
  }, [leaderTodos, selectedTodoId]);

  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const getPriorityBadge = (p: LeaderTodoPriority) => {
    switch (p) {
      case 'highest':
        return <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-full">🔴 最優先</span>;
      case 'high':
        return <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black px-2 py-0.5 rounded-full">🟧 高</span>;
      case 'medium':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full">🟨 中</span>;
      case 'low':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-full">🟦 低</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (s: LeaderTodo['status']) => {
    switch (s) {
      case 'completed':
        return <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded">実施完了</span>;
      case 'in_progress':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">進行中</span>;
      case 'pending':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">要保留・確認</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded">未実施</span>;
    }
  };

  // 💡 非リーダー権限ユーザーに対するアクセス制限制御
  if (currentUser && !currentUser.is_leader) {
    return (
      <div className="flex-1 bg-gray-100 flex flex-col items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl max-w-md text-center animate-fade-in">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="font-extrabold text-lg text-gray-900 mb-2">アクセス制限画面</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            「リーダー用TODO画面」はリーダー権限（<span className="font-bold text-indigo-700">is_leader: true</span>）を持つ看護師アカウントでのみ表示・操作可能です。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-100 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* 画面サブヘッダー */}
      <div className="bg-indigo-900 text-white px-6 py-3 shadow-md flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h1 className="font-black text-lg leading-tight">リーダー用TODO ＆ 申し送り・方向性管理</h1>
            <p className="text-[11px] text-indigo-200">全優先度（最優先・高・中・低）のリーダーTODOを一括管理・経過結果記録</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 📊 計画進捗率プログレスバー */}
          <div className="flex items-center gap-3 bg-indigo-950/80 px-3.5 py-1.5 rounded-xl border border-indigo-700/60 shadow-inner">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-indigo-300">タイムライン計画進捗</span>
              <span className="text-xs font-black text-emerald-400">
                {progressStats.progressPercent}% <span className="text-[10px] text-indigo-200 font-normal">({progressStats.overallCompletedCount}/{progressStats.totalCount}件完了)</span>
              </span>
            </div>
            <div className="w-24 bg-indigo-900 h-2.5 rounded-full overflow-hidden border border-indigo-700/60 p-0.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-300 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressStats.progressPercent}%` }}
              />
            </div>
          </div>

          {/* 優先度クイックフィルター */}
          <div className="flex items-center gap-2 bg-indigo-950/60 p-1.5 rounded-xl border border-indigo-700/50">
            <span className="text-xs font-bold text-indigo-200 px-2">優先度:</span>
            {['all', 'highest', 'high', 'medium', 'low'].map((pKey) => (
              <button
                key={pKey}
                onClick={() => setFilterPriority(pKey)}
                className={`text-xs font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterPriority === pKey
                    ? 'bg-white text-indigo-900 shadow-md scale-105'
                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {pKey === 'all' && 'すべて'}
                {pKey === 'highest' && '🔴 最優先'}
                {pKey === 'high' && '🟧 高'}
                {pKey === 'medium' && '🟨 中'}
                {pKey === 'low' && '🟦 低'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 保存成功・通知トーストポップアップ */}
      {saveSuccessNotice && (
        <div className={`mx-6 mt-3 px-4 py-2.5 rounded-xl shadow-lg font-black text-xs flex items-center justify-between animate-fade-in border ${
          saveSuccessNotice.includes('⚠️')
            ? 'bg-red-600 text-white border-red-500'
            : 'bg-emerald-600 text-white border-emerald-500'
        }`}>
          <div className="flex items-center gap-2">
            <span>{saveSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessNotice(null)}
            className="text-white/80 hover:text-white font-extrabold text-xs px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3分割メインコンテンツエリア */}
      <div className="flex-1 flex overflow-hidden gap-2">
        {/* ─── 【左カラム: 28%】患者選択 ＆ TODO作成 ─── */}
        <div className="w-[28%] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-3.5 flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5">
              <span>🏥 患者リスト</span>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded-full">
                {patients.length}名
              </span>
            </h2>
            <span className="text-[10px] text-gray-500 font-bold">クリックでTODO作成</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {patients.map((patient) => {
              const patientTodoCount = leaderTodos.filter((t) => {
                if (t.patient_id !== patient.patient_id || t.is_deleted || t.status === 'deleted') return false;
                if (!currentUser) return true;
                if (t.nurse_id || t.user_id) {
                  return t.nurse_id === currentUser.nurse_id || 
                         t.user_id === currentUser.nurse_id || 
                         t.nurse_id === currentUser.email || 
                         t.user_id === currentUser.email;
                }
                return t.updated_by === currentUser.name;
              }).length;
              return (
                <div
                  key={patient.patient_id}
                  onClick={() => setSelectedPatientForModal(patient)}
                  className="bg-white hover:bg-indigo-50/60 border border-gray-200 hover:border-indigo-300 rounded-xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-900 font-extrabold text-xs flex items-center justify-center border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {patient.room_id}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-gray-900 group-hover:text-indigo-900 transition-colors">
                        {patient.name} 様
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        部屋: {patient.room_id}号室
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {patientTodoCount > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                        TODO {patientTodoCount}
                      </span>
                    )}
                    <span className="text-indigo-600 font-black text-sm group-hover:translate-x-0.5 transition-transform">
                      ＋
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 【中央カラム: 44%】未対応・対応中TODOタイムライン ─── */}
        <div className="w-[44%] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-3.5 flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5">
              <span>⏱️ 未対応・対応中TODO</span>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded-full">
                {activeTodos.length}件
              </span>
            </h2>
            <span className="text-[10px] text-gray-500 font-bold">カードクリックで対応結果入力</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
            {activeTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <span className="text-4xl mb-2">🎉</span>
                <p className="text-xs font-bold">現在未対応のリーダーTODOはありません</p>
                <p className="text-[11px] text-gray-400 mt-1">対応済みのタスクは右側エリアに保存されます</p>
              </div>
            ) : (
              activeTodos.map((todo) => {
                return (
                  <div
                    key={todo.todo_id}
                    onClick={() => setResultModalTodo(todo)}
                    className="border-2 border-gray-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 rounded-xl p-3.5 transition-all cursor-pointer flex flex-col gap-2 relative shadow-xs hover:shadow-md group"
                  >
                    {/* カードヘッダー */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-900 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-md">
                          ⏰ {todo.scheduled_at || '随時'}
                        </span>
                        <span className="text-xs font-black text-indigo-950 bg-indigo-100 px-2 py-0.5 rounded">
                          {todo.category}
                        </span>
                        {getPriorityBadge(todo.priority)}
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(todo.status)}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTodo(todo);
                          }}
                          className="!bg-white hover:!bg-gray-100 !text-gray-700 !border !border-gray-300 !text-[11px] !font-extrabold !px-2 !py-0.5 !rounded-md !shadow-sm hover:!shadow !transition-all !cursor-pointer !flex !items-center !gap-1"
                        >
                          <span>✏️</span>
                          <span>編集</span>
                        </button>
                      </div>
                    </div>

                    {/* 患者名 ＆ 部屋番号 */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                        <span>{todo.patient_name} 様</span>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {todo.room_id}号室
                        </span>
                      </div>

                      {todo.requires_double_check && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⚠️ ダブルチェック要
                        </span>
                      )}
                    </div>

                    {/* タイトル本文 */}
                    <div className="text-xs text-gray-800 font-medium leading-relaxed bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                      {todo.title}
                    </div>

                    {/* アクション呼び出しフッターボタン */}
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResultModalTodo(todo);
                        }}
                        className="!bg-indigo-700 group-hover:!bg-indigo-800 !text-white !font-extrabold !text-xs !px-3.5 !py-1.5 !rounded-lg !shadow-sm hover:!shadow !transition-all !cursor-pointer !flex !items-center !gap-1.5"
                      >
                        <span>✍️</span>
                        <span>対応入力・結果記録</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── 【右カラム: 28%】本日対応済み・完了TODO集約エリア ─── */}
        <div className="w-[28%] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="bg-emerald-800 text-white p-3.5 flex items-center justify-between shadow-xs">
            <h2 className="font-extrabold text-sm flex items-center gap-1.5">
              <span>✅ 本日対応済み・完了TODO</span>
              <span className="text-xs bg-white text-emerald-900 font-black px-2 py-0.5 rounded-full">
                {completedTodos.length}件
              </span>
            </h2>
            <span className="text-[10px] text-emerald-200 font-bold">対応完了履歴</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-emerald-50/20">
            {completedTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <span className="text-4xl mb-2">📑</span>
                <p className="text-xs font-bold">本日対応済みのTODOはまだありません</p>
                <p className="text-[11px] text-gray-400 mt-1">対応・記録を入力したTODOがここに集約されます</p>
              </div>
            ) : (
              completedTodos.map((todo) => (
                <div
                  key={todo.todo_id}
                  className="bg-white border border-emerald-200 rounded-xl p-3 shadow-xs flex flex-col gap-2 relative hover:border-emerald-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-100 text-emerald-950 font-extrabold text-[11px] px-2 py-0.5 rounded">
                      🟢 実施完了
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        ⏰ {todo.scheduled_at || '随時'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setResultModalTodo(todo)}
                        className="!bg-emerald-50 hover:!bg-emerald-100 !text-emerald-800 !border !border-emerald-200 !text-[10px] !font-bold !px-2 !py-0.5 !rounded !cursor-pointer !transition-colors"
                      >
                        ✏️ 記録再編集
                      </button>
                    </div>
                  </div>

                  <div className="font-black text-xs text-gray-900 flex items-center justify-between">
                    <span>{todo.patient_name} 様</span>
                    <span className="text-[10px] font-bold text-gray-500">{todo.room_id}号室</span>
                  </div>

                  <div className="text-xs font-bold text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    📌 {todo.title}
                  </div>

                  {todo.result_outcome && (
                    <div className="text-[11px] font-bold text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200/60 flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-emerald-700">💡 結果・方針記録:</span>
                      <span className="leading-relaxed">{todo.result_outcome}</span>
                    </div>
                  )}

                  {todo.doctor_instructions && (
                    <div className="text-[11px] font-bold text-indigo-900 bg-indigo-50 p-2 rounded-lg border border-indigo-200/60 flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-indigo-700">🩺 医師指示メモ:</span>
                      <span className="leading-relaxed">{todo.doctor_instructions}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 新規TODO作成モーダル */}
      {selectedPatientForModal && (
        <LeaderTodoModal
          patient={selectedPatientForModal}
          onClose={() => setSelectedPatientForModal(null)}
        />
      )}

      {/* TODO編集モーダル */}
      {editingTodo && (
        <LeaderTodoModal
          todoToEdit={editingTodo}
          onClose={() => setEditingTodo(null)}
          onDeleteSuccess={() => {
            setSelectedTodoId(null);
            setSaveSuccessNotice('✨ 【削除完了】 リーダーTODOを削除（画面から非表示）しました！');
            setTimeout(() => setSaveSuccessNotice(null), 3500);
          }}
        />
      )}

      {/* TODO対応結果・方針記録モーダル */}
      {resultModalTodo && (
        <LeaderTodoResultModal
          todo={resultModalTodo}
          onClose={() => setResultModalTodo(null)}
          onSuccess={() => {
            setSaveSuccessNotice('✨ 【対応結果保存】 TODOの対応結果・方針を記録しました！');
            setTimeout(() => setSaveSuccessNotice(null), 3500);
          }}
        />
      )}
    </div>
  );
};
