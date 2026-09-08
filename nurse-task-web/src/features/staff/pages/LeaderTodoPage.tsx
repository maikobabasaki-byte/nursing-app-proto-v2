import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { checkIsLeader } from '../../../utils/userUtils';
import type { LeaderTodo, LeaderTodoPriority } from '../../../types/types';
import { LeaderTodoModal } from '../components/LeaderTodoPage/LeaderTodoModal';
import { LeaderTodoResultModal } from '../components/LeaderTodoPage/LeaderTodoResultModal';
import { calculateLeaderTodoProgress } from '../../../utils/progressCalculator';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface PatientItem {
  patient_id: string;
  name: string;
  room_id: string;
  gender?: string;
  team?: string;
}

export const LeaderTodoPage: React.FC = () => {
  const leaderTodos = useTimelineStore((state) => state.leaderTodos);
  const setLeaderTodos = useTimelineStore((state) => state.setLeaderTodos);
  const currentUser = useTimelineStore((state) => state.currentUser);
  const toggleHandover = useTimelineStore((state) => state.toggleHandover);
  const pullTaskFromHandover = useTimelineStore((state) => state.pullTaskFromHandover);
  const addProgressLog = useTimelineStore((state) => state.addProgressLog);
  const handoverTeamTab = useTimelineStore((state) => state.handoverTeamTab);
  const setHandoverTeamTab = useTimelineStore((state) => state.setHandoverTeamTab);

  const [expandedHandoverIds, setExpandedHandoverIds] = useState<Record<string, boolean>>({});
  const [logInputText, setLogInputText] = useState<Record<string, string>>({});

  // 🤝 中央カラム: 申し送りBOXと未対応TODOパネルの可変高さリサイズ用state & イベント (初期150px)
  const [handoverBoxHeight, setHandoverBoxHeight] = useState<number>(150);
  const [isResizingHandover, setIsResizingHandover] = useState<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingHandover(true);
    startYRef.current = e.clientY;
    startHeightRef.current = handoverBoxHeight;
  };

  useEffect(() => {
    if (!isResizingHandover) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(0, startHeightRef.current + deltaY);
      setHandoverBoxHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingHandover(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHandover]);

  const toggleHandoverExpand = (todoId: string) => {
    setExpandedHandoverIds((prev) => ({
      ...prev,
      [todoId]: !prev[todoId],
    }));
  };

  const handleAddProgressLog = (todoId: string) => {
    const text = logInputText[todoId];
    if (!text || !text.trim()) return;
    const author = currentUser?.name || 'リーダー';
    addProgressLog(todoId, author, text);
    setLogInputText((prev) => ({ ...prev, [todoId]: '' }));
  };

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [selectedPatientForModal, setSelectedPatientForModal] = useState<{
    patient_id: string;
    name: string;
    room_id: string;
    team?: string;
  } | null>(null);

  const [editingTodo, setEditingTodo] = useState<LeaderTodo | null>(null);
  const [resultModalTodo, setResultModalTodo] = useState<LeaderTodo | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all'); // all | urgent | high | medium
  const [activeTodoTab, setActiveTodoTab] = useState<'patients' | 'active' | 'completed'>('active');

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

  // 患者マスター一覧の取得 (プロダクション /app/ パス対応)
  useEffect(() => {
    const candidatePaths = [
      `/app/data/patients.json`,
      `${import.meta.env.BASE_URL || '/app/'}data/patients.json`.replace(/\/+/g, '/'),
      `/data/patients.json`,
    ];
    const loadData = async () => {
      for (const path of candidatePaths) {
        try {
          const res = await fetch(path);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.patients || [];
            setPatients(
              list.map((p: any) => ({
                patient_id: p.patient_id || String(p.id),
                name: p.name || p.patient_name || '患者',
                room_id: p.room_id || String(p.room || '000'),
                gender: p.gender,
                team: p.team,
              }))
            );
            return;
          }
        } catch (e) {}
      }
    };
    loadData();
  }, []);

  // 💡 チーム名正規化ヘルパー ('A', 'B')
  const normalizeTeam = (t?: string): string => {
    if (!t) return '';
    const clean = t.trim().toUpperCase();
    if (clean.includes('A')) return 'A';
    if (clean.includes('B')) return 'B';
    return clean;
  };

  // 💡 部屋番号の数値パース（ソート・チーム判定用）
  const parseRoomNumber = (roomId?: string): number => {
    if (!roomId) return 9999;
    const num = parseInt(roomId.replace(/\D/g, ''), 10);
    return isNaN(num) ? 9999 : num;
  };

  // 💡 患者マスターマップ (IDおよび部屋番号でのチーム検索用)
  const patientMap = useMemo(() => {
    const map = new Map<string, PatientItem>();
    patients.forEach((p) => {
      map.set(p.patient_id, p);
      if (p.room_id) map.set(`room-${p.room_id}`, p);
    });
    return map;
  }, [patients]);

  // 💡 タスク所属チーム判定ヘルパー
  const getTodoTeam = (todo: LeaderTodo): string => {
    if (todo.team) return normalizeTeam(todo.team);
    const p = patientMap.get(todo.patient_id) || patientMap.get(`room-${todo.room_id}`);
    if (p && p.team) return normalizeTeam(p.team);
    const roomNum = parseRoomNumber(todo.room_id);
    if (roomNum <= 206) return 'A';
    return 'B';
  };

  // 💡 タイムスタンプ（Firestore ServerTimestamp, Date, String, Number）の数値変換
  const getTimestampValue = (item: any): number => {
    if (!item) return 0;
    const ts = item.updatedAt || item.updated_at || item.created_at || item;
    if (ts?.toDate && typeof ts.toDate === 'function') {
      return ts.toDate().getTime();
    }
    if (ts?.seconds) {
      return ts.seconds * 1000;
    }
    if (typeof ts === 'string' || typeof ts === 'number') {
      const parsed = new Date(ts).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  // 💡 自動ソート第1ソート用: タスクの最新タイムスタンプ値（ミリ秒）取得ヘルパー
  const getTodoNewestTimeValue = (todo: LeaderTodo): number => {
    if (todo.updated_at) {
      const ts = getTimestampValue(todo.updated_at);
      if (ts > 0) return ts;
    }
    const rawDate = todo.targetDate || todo.target_date;
    if (rawDate && rawDate.trim()) {
      const cleanDate = rawDate.trim().replace(/\//g, '-');
      const timeStr = todo.scheduled_at && todo.scheduled_at.match(/^\d{1,2}:\d{2}$/) ? todo.scheduled_at : '00:00';
      const isoStr = `${cleanDate}T${timeStr}:00`;
      const parsed = new Date(isoStr).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (todo.progressLogs && todo.progressLogs.length > 0) {
      const lastLog = todo.progressLogs[todo.progressLogs.length - 1];
      if (lastLog.id && lastLog.id.includes('log-')) {
        const parts = lastLog.id.split('-');
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return 0;
  };

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
        if (t.assignee && t.assignee === currentUser.name) return true;
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

  // 🤝 共有申し送りBOX全件抽出＆チーム別集計
  const rawHandoverTodos = useMemo(() => {
    return leaderTodos.filter((t) => !t.is_deleted && t.status !== 'deleted' && t.isHandover === true);
  }, [leaderTodos]);

  const teamCounts = useMemo(() => {
    let countA = 0;
    let countB = 0;
    rawHandoverTodos.forEach((todo) => {
      const team = getTodoTeam(todo);
      if (team === 'A') countA++;
      else if (team === 'B') countB++;
    });
    return {
      all: rawHandoverTodos.length,
      A: countA,
      B: countB,
    };
  }, [rawHandoverTodos, patientMap]);

  const [handoverSearchQuery, setHandoverSearchQuery] = useState<string>('');

  // 🤝 共有申し送りBOX表示用: 選択中のチームタブ・患者名/部屋番号検索クエリでフィルタ＆第1ソート(新しい順)・第2ソート(部屋番号昇順)で自動並び替え
  const handoverTodos = useMemo(() => {
    let filteredList = rawHandoverTodos.filter((todo) => {
      if (handoverTeamTab === 'all') return true;
      return getTodoTeam(todo) === handoverTeamTab;
    });

    // 🔍 患者名・部屋番号・キーワードでのリアルタイム検索フィルター
    if (handoverSearchQuery.trim()) {
      const query = handoverSearchQuery.trim().toLowerCase().replace(/[\s　]+/g, '');
      filteredList = filteredList.filter((todo) => {
        const nameMatch = (todo.patient_name || '').toLowerCase().replace(/[\s　]+/g, '').includes(query);
        const roomMatch = (todo.room_id || '').toLowerCase().replace(/[\s{]+/g, '').includes(query);
        const titleMatch = (todo.title || '').toLowerCase().includes(query);
        const patientIdMatch = (todo.patient_id || '').toLowerCase().includes(query);
        return nameMatch || roomMatch || titleMatch || patientIdMatch;
      });
    }

    return filteredList.sort((a, b) => {
      // 第1ソート: 日付・作成時間の新しい順（降順）
      const timeA = getTodoNewestTimeValue(a);
      const timeB = getTodoNewestTimeValue(b);
      if (timeA !== timeB) {
        return timeB - timeA;
      }

      // 第2ソート: 同じ日時の中では、部屋番号の昇順（201, 202, 203…）
      const roomA = parseRoomNumber(a.room_id);
      const roomB = parseRoomNumber(b.room_id);
      if (roomA !== roomB) {
        return roomA - roomB;
      }

      return (a.title || '').localeCompare(b.title || '');
    });
  }, [rawHandoverTodos, handoverTeamTab, handoverSearchQuery, patientMap]);

  // 🎯 右カラム用: 本日対応済み（実施完了）TODOリスト
  const completedTodos = useMemo(() => {
    return allMyTodos.filter((t) => t.status === 'completed');
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

  const isLeader = checkIsLeader(currentUser);

  // 💡 非リーダー権限ユーザーに対するアクセス制限制御
  if (!isLeader) {
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

  // 💡 各カラムの描画関数（PC・タブレット共通）
  const renderPatientsColumn = () => (
    <div id="leader-todo-patients" className="w-full h-full bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <div id="leader-todo-patients-header" className="bg-gray-50 border-b border-gray-200 p-3.5 flex items-center justify-between">
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
  );

  // 対象日・作成日 (targetDate) の YYYY/MM/DD フォーマット文字列取得ヘルパー
  const getFormatTargetDate = (todo: { targetDate?: string; target_date?: string }): string => {
    const raw = todo.targetDate || todo.target_date;
    if (raw && raw.trim() !== '') {
      const clean = raw.trim().replace(/-/g, '/');
      if (clean.match(/^\d{4}\/\d{2}\/\d{2}$/)) return clean;
      if (clean.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
        const parts = clean.split('/');
        return `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
      }
    }
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
  };

  // 📜 スレッド型経過履歴＆追記フォームのレンダラー
  const renderProgressLogsSection = (todo: LeaderTodo) => {
    const isExpanded = Boolean(expandedHandoverIds[todo.todo_id]);
    const logs = todo.progressLogs || [];
    if (!isExpanded) return null;

    return (
      <div className="mt-1 pt-2.5 border-t border-amber-200/80 flex flex-col gap-2.5 bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-inner animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-amber-950 flex items-center gap-1">
            <span>📜 経過記録タイムライン・申し送り履歴</span>
          </span>
          <span className="text-[9px] text-gray-500 font-bold">時系列で全ログ保持</span>
        </div>

        {/* ログ一覧 */}
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="text-[11px] font-medium text-gray-400 bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
              まだ経過記録の追記はありません。下のフォームから追記できます。
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2 flex flex-col gap-1 shadow-2xs"
              >
                <div className="flex items-center justify-between text-[10px] font-black">
                  <span className="text-indigo-900 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                    👤 {log.author}
                  </span>
                  <span className="text-gray-500 font-mono">
                    ⏰ {log.time}
                  </span>
                </div>
                <p className="text-xs text-gray-800 font-medium leading-relaxed whitespace-pre-wrap pl-1">
                  {log.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* 追記入力フォーム */}
        <div className="pt-1 flex items-center gap-2 border-t border-gray-100">
          <input
            type="text"
            placeholder="経過情報・確認結果を追記..."
            value={logInputText[todo.todo_id] || ''}
            onChange={(e) =>
              setLogInputText((prev) => ({
                ...prev,
                [todo.todo_id]: e.target.value,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleAddProgressLog(todo.todo_id);
              }
            }}
            className="flex-1 bg-white border border-amber-300 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium shadow-2xs"
          />
          <button
            type="button"
            onClick={() => handleAddProgressLog(todo.todo_id)}
            disabled={!logInputText[todo.todo_id]?.trim()}
            className="!bg-amber-700 !hover:bg-amber-800 !disabled:opacity-40 !text-white !font-extrabold !text-xs !px-3 !py-1.5 !rounded-lg !shadow-xs !transition-colors !shrink-0 !cursor-pointer"
          >
            追記する
          </button>
        </div>
      </div>
    );
  };

  // 🤝 共有申し送りBOXパネル (スレッド型履歴＆チームタブ＆自動ソート機能付き)
  const renderHandoverBox = () => {
    const hasItems = handoverTodos.length > 0;

    return (
      <div id="leader-todo-handover-box" className="w-full bg-amber-50/90 rounded-2xl border border-amber-300 shadow-sm flex flex-col overflow-hidden shrink-0 transition-all">
        {/* 🤝 ヘッダー ＆ 👥 チーム別切り替えタブ ＆ 🔍 患者検索バー */}
        <div className="bg-amber-100/95 px-3 py-2 flex flex-col gap-2 shrink-0 border-b border-amber-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                <span>🤝 共有申し送りBOX</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  hasItems ? 'bg-amber-300 text-amber-950 border border-amber-400' : 'bg-gray-200 text-gray-600'
                }`}>
                  {handoverTodos.length}件
                </span>
              </h2>
              <span className="text-[9px] text-amber-800 font-bold hidden md:inline">次シフト引き継ぎ・ヘルプ用</span>
            </div>

            {/* 👥 チーム別切り替えタブバー */}
            <div className="!flex !items-center !gap-1 !bg-amber-200/90 !p-0.5 !rounded-xl !border !border-amber-300/80 !shadow-2xs !shrink-0">
              {[
                { key: 'all', label: '全体', count: teamCounts.all },
                { key: 'A', label: 'チームA', count: teamCounts.A },
                { key: 'B', label: 'チームB', count: teamCounts.B },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setHandoverTeamTab(tab.key)}
                  className={`!text-[11px] !font-extrabold !px-2.5 !py-1 !rounded-lg !transition-all !cursor-pointer !flex !items-center !gap-1.5 ${
                    handoverTeamTab === tab.key
                      ? '!bg-amber-700 !text-white shadow-xs font-black'
                      : '!bg-transparent !text-amber-950 hover:!bg-amber-300/80'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.1 rounded-full ${
                    handoverTeamTab === tab.key ? 'bg-amber-900 text-amber-100' : 'bg-amber-300 text-amber-950'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 🔍 患者名・部屋番号リアルタイム検索インプット */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="🔍患者名・部屋番号 (例: 山田, 201) で申し送り検索..."
              value={handoverSearchQuery}
              onChange={(e) => setHandoverSearchQuery(e.target.value)}
              className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-lg pl-7 pr-7 py-1 text-xs text-gray-900 font-bold placeholder-amber-800/50 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-2xs"
            />
            {handoverSearchQuery && (
              <button
                type="button"
                onClick={() => setHandoverSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs font-bold text-amber-800/70 hover:text-amber-950 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {!hasItems ? (
          <div className="w-full bg-white/90 p-4 text-center text-xs text-amber-900 font-bold border-b border-amber-200">
            {handoverSearchQuery
              ? `「${handoverSearchQuery}」に一致する共有申し送りタスクはありません。`
              : handoverTeamTab === 'all'
              ? '現在、共有申し送りBOXにタスクはありません。'
              : `チーム${handoverTeamTab} の共有申し送りタスクはありません。`}
          </div>
        ) : (
          <div
            className="w-full bg-white/90 p-2 overflow-y-auto min-h-0 flex flex-col gap-2.5 select-none"
            style={{ height: `${handoverBoxHeight}px`, resize: 'vertical' }}
          >
            {handoverTodos.map((todo) => {
              const isExpanded = Boolean(expandedHandoverIds[todo.todo_id]);
              const logs = todo.progressLogs || [];
              const todoTeam = getTodoTeam(todo);

              return (
                <div
                  key={`handover-${todo.todo_id}`}
                  onClick={() => setEditingTodo(todo)}
                  className="bg-amber-50/90 hover:bg-amber-100/60 border border-amber-300 rounded-xl p-3 shadow-xs flex flex-col gap-2 transition-all cursor-pointer"
                >
                  {/* カード上部サマリー行 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getStatusBadge(todo.status)}
                        {/* 👥 チームバッジ */}
                        <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 font-black text-[10px] px-1.5 py-0.2 rounded">
                          チーム{todoTeam}
                        </span>
                        {/* YYYY/MM/DD 日付ラベル */}
                        <span className="bg-amber-200 text-amber-950 font-black text-[10px] px-1.5 py-0.2 rounded border border-amber-300">
                          {getFormatTargetDate(todo)}
                        </span>
                        <span className="bg-amber-200 text-amber-900 font-black text-[10px] px-1.5 py-0.2 rounded">
                          ⏰ {todo.scheduled_at || '随時'}
                        </span>
                        <span className="font-extrabold text-xs text-gray-900 truncate">
                          {todo.patient_name} 様 ({todo.room_id}号室)
                        </span>
                        {getPriorityBadge(todo.priority)}
                      </div>
                      <p className="text-xs text-gray-800 font-bold leading-normal">
                        {todo.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {/* 🙋 自分が引き受ける / 解除する トグルボタン */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          pullTaskFromHandover(todo.todo_id, currentUser?.name || 'リーダー');
                        }}
                        className={`!text-[10px] !font-extrabold !px-2.5 !py-1 !rounded-md !border !transition-all !cursor-pointer !flex !items-center !gap-1 !shadow-xs ${
                          todo.assignee === currentUser?.name
                            ? '!bg-emerald-600 hover:!bg-emerald-700 !text-white !border-emerald-700 shadow-sm'
                            : todo.assignee
                            ? '!bg-indigo-100 !text-indigo-900 !border-indigo-300 hover:!bg-indigo-200'
                            : '!bg-emerald-600 hover:!bg-emerald-700 !text-white !border-emerald-700 !ring-2 !ring-emerald-300/80'
                        }`}
                      >
                        <span>
                          {todo.assignee === currentUser?.name
                            ? '✓ 担当中 (解除する)'
                            : todo.assignee
                            ? `👤 担当:${todo.assignee}`
                            : '🙋 自分が引き受ける'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHandoverExpand(todo.todo_id);
                        }}
                        className={`!text-[10px] !font-extrabold !px-2 !py-1 !rounded-md !border !transition-all !cursor-pointer !flex !items-center !gap-1 ${
                          isExpanded
                            ? '!bg-amber-600 !text-white !border-amber-700 !shadow-xs'
                            : '!bg-white !text-amber-900 !border-amber-300 hover:!bg-amber-100'
                        }`}
                      >
                        <span>経過ログ ({logs.length}) {isExpanded ? '▲' : '▼'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHandover(todo.todo_id);
                        }}
                        className="!bg-white hover:!bg-red-50 !text-red-700 hover:!text-red-800 !border !border-amber-300 hover:!border-red-300 !text-[10px] !font-extrabold !px-2 !py-1 !rounded-md !transition-all !cursor-pointer !shadow-xs"
                      >
                        外す ✕
                      </button>
                    </div>
                  </div>

                  {/* 展開時: スレッド型タイムライン経過履歴 & 追記フォーム */}
                  {renderProgressLogsSection(todo)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderActiveTodosColumn = () => (
    <div id="leader-todo-active-list" className="w-full flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <div id="leader-todo-active-header" className="bg-gray-50 border-b border-gray-200 p-3.5 flex items-center justify-between shrink-0">
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
                onClick={() => setEditingTodo(todo)}
                className={`border-2 rounded-xl p-3.5 transition-all cursor-pointer flex flex-col gap-2 relative shadow-xs hover:shadow-md group ${
                  todo.isHandover
                    ? 'border-amber-400 bg-amber-50/30 hover:bg-amber-50/60'
                    : 'border-gray-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/40'
                }`}
              >
                {/* カードヘッダー */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-indigo-950 text-indigo-100 font-extrabold text-[10px] px-2 py-0.5 rounded border border-indigo-700">
                      {getFormatTargetDate(todo)}
                    </span>
                    <span className="bg-indigo-900 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-md">
                      ⏰ {todo.scheduled_at || '随時'}
                    </span>
                    <span className="text-xs font-black text-indigo-950 bg-indigo-100 px-2 py-0.5 rounded">
                      {todo.category}
                    </span>
                    {getPriorityBadge(todo.priority)}
                    {todo.assignee && (
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        👤 担当: {todo.assignee}
                      </span>
                    )}
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
                <div className="pt-1 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHandover(todo.todo_id);
                      }}
                      className={`!text-xs !font-extrabold !px-3 !py-1.5 !rounded-lg !border !transition-all !cursor-pointer !flex !items-center !gap-1.5 ${
                        todo.isHandover
                          ? '!bg-amber-500 hover:!bg-amber-600 !text-white !border-amber-600 !shadow-sm'
                          : '!bg-amber-50 hover:!bg-amber-100 !text-amber-900 !border-amber-300'
                      }`}
                    >
                      <span>🤝</span>
                      <span>{todo.isHandover ? '申し送り中' : '共有BOXへ送る'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHandoverExpand(todo.todo_id);
                      }}
                      className={`!text-xs !font-extrabold !px-2.5 !py-1.5 !rounded-lg !border !transition-all !cursor-pointer !flex !items-center !gap-1 ${
                        expandedHandoverIds[todo.todo_id]
                          ? '!bg-amber-600 !text-white !border-amber-700 !shadow-xs'
                          : '!bg-gray-100 !text-gray-700 !border-gray-300 hover:!bg-gray-200'
                      }`}
                    >
                      <span>経過 ({(todo.progressLogs || []).length}) {expandedHandoverIds[todo.todo_id] ? '▲' : '▼'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTodo(todo);
                    }}
                    className="!bg-indigo-700 group-hover:!bg-indigo-800 !text-white !font-extrabold !text-xs !px-3.5 !py-1.5 !rounded-lg !shadow-sm hover:!shadow !transition-all !cursor-pointer !flex !items-center !gap-1.5"
                  >
                    <span>✍️</span>
                    <span>対応入力・結果記録</span>
                  </button>
                </div>

                {renderProgressLogsSection(todo)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderCompletedTodosColumn = () => (
    <div id="leader-todo-completed-list" className="w-full h-full bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <div id="leader-todo-completed-header" className="bg-emerald-800 text-white p-3.5 flex items-center justify-between shadow-xs">
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
              onClick={() => setEditingTodo(todo)}
              className="bg-white border border-emerald-200 rounded-xl p-3 shadow-xs flex flex-col gap-2 relative hover:border-emerald-400 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-emerald-100 text-emerald-950 font-extrabold text-[11px] px-2 py-0.5 rounded">
                    🟢 実施完了
                  </span>
                  <span className="bg-emerald-200 text-emerald-950 font-black text-[10px] px-1.5 py-0.2 rounded border border-emerald-300">
                    {getFormatTargetDate(todo)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    ⏰ {todo.scheduled_at || '随時'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTodo(todo);
                    }}
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

              {/* 🤝 完了済みカードフッター */}
              <div className="pt-1.5 border-t border-emerald-100 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHandoverExpand(todo.todo_id);
                  }}
                  className={`!text-[10px] !font-extrabold !px-2 !py-1 !rounded-md !border !transition-all !cursor-pointer !flex !items-center !gap-1 ${
                    expandedHandoverIds[todo.todo_id]
                      ? '!bg-amber-600 !text-white !border-amber-700 !shadow-xs'
                      : '!bg-white !text-amber-900 !border-amber-300 hover:!bg-amber-100'
                  }`}
                >
                  <span>経過ログ ({(todo.progressLogs || []).length}) {expandedHandoverIds[todo.todo_id] ? '▲' : '▼'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHandover(todo.todo_id);
                  }}
                  className={`!text-[11px] !font-extrabold !px-2.5 !py-1 !rounded-lg !border !transition-all !cursor-pointer !flex !items-center !gap-1.5 ${
                    todo.isHandover
                      ? '!bg-amber-500 hover:!bg-amber-600 !text-white !border-amber-600 !shadow-sm'
                      : '!bg-amber-50 hover:!bg-amber-100 !text-amber-900 !border-amber-300'
                  }`}
                >
                  <span>🤝</span>
                  <span>{todo.isHandover ? '申し送り中' : '共有BOXへ送る'}</span>
                </button>
              </div>

              {renderProgressLogsSection(todo)}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 bg-gray-100 flex flex-col w-full h-full overflow-hidden">
      {/* 画面サブヘッダー */}
      <div id="leader-todo-header" className="bg-indigo-900 text-white px-3 sm:px-6 py-2.5 sm:py-3 shadow-md flex items-center justify-between flex-shrink-0">
        <div className="hidden lg:flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">📋</span>
          <div>
            <h1 className="font-black text-sm sm:text-lg leading-tight">リーダー用TODO ＆ 申し送り・方向性管理</h1>
            <p className="text-[11px] text-indigo-200 hidden xl:block">全優先度（最優先・高・中・低）のリーダーTODOを一括管理・経過結果記録</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* 📊 計画進捗率プログレスバー */}
          <div id="leader-todo-progress-bar" className="flex items-center gap-2 sm:gap-3 bg-indigo-950/80 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border border-indigo-700/60 shadow-inner">
            <div className="flex flex-col text-right">
              <span className="text-[9px] sm:text-[10px] font-bold text-indigo-300">計画進捗</span>
              <span className="text-[11px] sm:text-xs font-black text-emerald-400">
                {progressStats.progressPercent}% <span className="text-[9px] sm:text-[10px] text-indigo-200 font-normal hidden xs:inline">({progressStats.overallCompletedCount}/{progressStats.totalCount}件)</span>
              </span>
            </div>
            <div className="w-14 sm:w-24 bg-indigo-900 h-2 sm:h-2.5 rounded-full overflow-hidden border border-indigo-700/60 p-0.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-300 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressStats.progressPercent}%` }}
              />
            </div>
          </div>

          {/* 優先度クイックフィルター（スマホ・PCレスポンシブ） */}
          <div id="leader-todo-filter" className="flex items-center gap-2 bg-indigo-950/60 p-1 sm:p-1.5 rounded-xl border border-indigo-700/50">
            <div className="sm:hidden">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-indigo-950 text-indigo-100 text-xs font-extrabold px-2 py-1 rounded-lg border border-indigo-700 focus:outline-none cursor-pointer"
              >
                <option value="all">優先度: すべて</option>
                <option value="highest">🔴 最優先</option>
                <option value="high">🟧 高</option>
                <option value="medium">🟨 中</option>
                <option value="low">🟦 低</option>
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-2">
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

      {/* 📱 タブレット・モバイル幅（lg未満）専用手帳風インデックスタブバー */}
      <div className="lg:hidden flex items-end px-3 pt-2 bg-slate-200/90 border-b-2 border-indigo-600 gap-1 shrink-0 select-none">
        <button
          id="tab-btn-patients"
          type="button"
          onClick={() => setActiveTodoTab('patients')}
          className={`!px-3 !py-2 !rounded-t-xl !transition-all !cursor-pointer !flex !items-center !gap-1 !border-t-2 !border-x-2 ${
            activeTodoTab === 'patients'
              ? '!bg-white !text-indigo-950 !font-black !border-indigo-600 !shadow-md !z-10 -mb-[2px] !pt-2.5 !pb-2'
              : '!bg-slate-100 !text-slate-600 hover:!bg-slate-50 !font-bold !border-slate-300 !border-b  !py-1.5'
          }`}
        >
          <span>患者選択 ({patients.length})</span>
        </button>

        <button
          id="tab-btn-active"
          type="button"
          onClick={() => setActiveTodoTab('active')}
          className={`!px-3 !py-2 !rounded-t-xl !transition-all !cursor-pointer !flex !items-center !gap-1 !border-t-2 !border-x-2 ${
            activeTodoTab === 'active'
              ? '!bg-white !text-indigo-950 !font-black !border-indigo-600 !shadow-md !z-10 -mb-[2px] !pt-2.5 !pb-2'
              : '!bg-slate-100 !text-slate-600 hover:!bg-slate-50 !font-bold !border-slate-300 !border-b !py-1.5'
          }`}
        >
          <span>未対応TODO ({activeTodos.length})</span>
        </button>

        <button
          id="tab-btn-completed"
          type="button"
          onClick={() => setActiveTodoTab('completed')}
          className={`!px-3 !py-2 !rounded-t-xl !transition-all !cursor-pointer !flex !items-center !gap-1 !border-t-2 !border-x-2 ${
            activeTodoTab === 'completed'
              ? '!bg-white !text-emerald-950 !font-black !border-emerald-600 !shadow-md !z-10 -mb-[2px] !pt-2.5 !pb-2'
              : '!bg-slate-100 !text-slate-600 hover:!bg-slate-50 !font-bold !border-slate-300 !border-b !py-1.5'
          }`}
        >
          <span>完了履歴 ({completedTodos.length})</span>
        </button>
      </div>

      {/* 統合レイアウトエリア（重複IDなし：PCは3列並列表示、スマホは選択タブを表示） */}
      <div className="flex-1 min-h-0 overflow-hidden p-2.5 bg-slate-100 flex flex-col lg:flex-row gap-2">
        <div className={`h-full ${activeTodoTab === 'patients' ? 'flex-1 lg:flex-none lg:w-[28%]' : 'hidden lg:block lg:w-[28%]'}`}>
          {renderPatientsColumn()}
        </div>
        <div className={`h-full flex flex-col gap-1 min-h-0 ${activeTodoTab === 'active' ? 'flex-1 lg:flex-none lg:w-[44%]' : 'hidden lg:block lg:w-[44%]'}`}>
          {renderHandoverBox()}

          {/* 🤝 申し送りBOXと未対応TODOパネルの境界ドラッグリサイザーハンドル */}
          {handoverTodos.length > 0 && (
            <div
              onMouseDown={handleMouseDownResizer}
              className={`w-full h-3 rounded-full my-0.5 cursor-row-resize flex items-center justify-center transition-all shrink-0 select-none group ${
                isResizingHandover ? 'bg-amber-400 ring-2 ring-amber-300 shadow-sm' : 'bg-amber-200/80 hover:bg-amber-300'
              }`}
              title="上下にドラッグして共有申し送りBOXと未対応TODOの高さを調整"
            >
              <div className="w-10 h-1 bg-amber-600/80 group-hover:bg-amber-900 rounded-full" />
            </div>
          )}

          {renderActiveTodosColumn()}
        </div>
        <div className={`h-full ${activeTodoTab === 'completed' ? 'flex-1 lg:flex-none lg:w-[28%]' : 'hidden lg:block lg:w-[28%]'}`}>
          {renderCompletedTodosColumn()}
        </div>
      </div>

      {/* 新規TODO作成モーダル */}
      {selectedPatientForModal && (
        <LeaderTodoModal
          patient={selectedPatientForModal}
          onClose={() => setSelectedPatientForModal(null)}
          onSuccess={() => {
            setActiveTodoTab('active'); // 🎯 新規TODO作成完了時：「未対応TODO」タブへ自動切替！
            setSaveSuccessNotice('✨ 【登録完了】 新規リーダーTODOを作成しました！未対応TODOタブへ移動しました');
            setTimeout(() => setSaveSuccessNotice(null), 3500);
          }}
        />
      )}

      {/* TODO編集モーダル */}
      {editingTodo && (
        <LeaderTodoModal
          todoToEdit={editingTodo}
          onClose={() => setEditingTodo(null)}
          onSuccess={() => {
            setActiveTodoTab('active'); // 🎯 TODO編集完了時：「未対応TODO」タブへ自動切替
            setSaveSuccessNotice('✨ 【更新完了】 リーダーTODOの変更内容を保存しました！');
            setTimeout(() => setSaveSuccessNotice(null), 3500);
          }}
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
            setActiveTodoTab('completed'); // 🎯 対応結果・完了記録時：「完了履歴」タブへ自動切替！
            setSaveSuccessNotice('✨ 【対応結果保存】 TODOの対応結果・方針を記録しました！完了履歴タブへ移動しました');
            setTimeout(() => setSaveSuccessNotice(null), 3500);
          }}
        />
      )}
    </div>
  );
};
