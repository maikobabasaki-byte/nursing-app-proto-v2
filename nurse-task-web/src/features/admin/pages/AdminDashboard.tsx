import React, { useState, useEffect } from 'react';
import type { Hint, ShiftInfo } from '../types/dashboard';
import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

// Zustandストアと日付ユーティリティのインポート
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { getJSTDateString } from '../../../utils/dateUtils';

// コンポーネント本体のインポート
import TrendLineChart from '../components/TrendLineChart';
import BlockerPieChart from '../components/BlockerPieChart';
import OvercrowdedHeatmap from '../components/OvercrowdedHeatmap';

// 型定義のインポート
import type { TrendData } from '../components/TrendLineChart';
import type { BlockerData } from '../components/BlockerPieChart';
import type { HeatmapDay, HeatmapHour, SelectedSlot } from '../components/OvercrowdedHeatmap';

// モックデータのJSONファイルインポート
import adminDashboardMock from '../data/adminDashboardMock.json';

// --- 介入履歴レコードの型定義 ---
export interface ManagementRecord {
  id: string;
  slotLabel: string;
  timestamp: string;
  content: string;
  isAiBased?: boolean;
}

// --- 1. 重み付けマスタの定義（コンポーネントの外に配置） ---
const TASK_BASE_TIME: Record<string, number> = {
  "バイタル": 5,
  "バイタル測定": 5,
  "配薬": 5,
  "点滴交換": 10,
  "点滴更新": 10,
  "清拭": 30,
  "全身清拭": 30,
  "清潔ケア": 30,
  "入浴介助": 45,
  "記録": 15,
  "口腔ケア": 15,
  "体位変換": 15,
  "車椅子移乗介助": 15,
  "おむつ交換": 15,
  "排泄介助": 20,
  "食事介助": 25,
  "全介助": 30,
  "創傷処置": 20,
  "処置": 20,
  "胃瘻管理": 20,
};

const ADL_MULTIPLIER: Record<string, number> = {
  "自立": 1.0,
  "見守り": 1.2,
  "一部介助": 1.5,
  "全介助": 2.0
};

const RISK_MULTIPLIER: Record<string, number> = {
  "低": 1.0,
  "中": 1.2,
  "高": 1.5
};

// --- 2. 実質負荷（分）を計算する関数 ---
const calculateTaskLoad = (taskTitle: string, adl: string, riskLevel: string): number => {
  let baseTime = TASK_BASE_TIME[taskTitle];
  if (!baseTime) {
    for (const [key, value] of Object.entries(TASK_BASE_TIME)) {
      if (taskTitle.includes(key)) {
        baseTime = value;
        break;
      }
    }
  }
  if (!baseTime) baseTime = 10; // 定義がない未知のタスクは一律10分とする

  const adlMult = ADL_MULTIPLIER[adl] || 1.0;
  const riskMult = RISK_MULTIPLIER[riskLevel] || 1.0;

  return baseTime * adlMult * riskMult;
};

/**
 * displayDate (YYYY-MM-DD) を起点として、1週間ずつ過去に遡った12個（約3ヶ月分）のデータポイントを自動生成する関数
 */
const generateBaseChartData = (baseDateStr: string): TrendData[] => {
  const parts = baseDateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1;
  let day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
    day = now.getDate();
  }

  const baseDate = new Date(year, month, day);

  // 12週分のダミー gapIndex (40〜90の範囲のダミー値)
  const dummyGapIndices = [45, 58, 78, 52, 64, 85, 61, 49, 80, 44, 55, 72];
  const generated: TrendData[] = [];

  // 古い日付が最初 (i = 11: 11週間前)、最新日 (i = 0: 当日)
  for (let i = 11; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - i * 7);

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const formattedDate = `${mm}/${dd}`;

    generated.push({
      date: formattedDate,
      gapIndex: dummyGapIndices[(11 - i) % dummyGapIndices.length],
      hasIntervention: false,
    });
  }

  return generated;
};

/**
 * 介入日付（"YYYY-MM-DD" や "MM/DD"）から12週分のチャートデータの中で最も近いデータポイントのインデックスを特定する関数
 */
const findClosestIndex = (
  chartItems: TrendData[],
  targetDateStr: string,
  baseDateStr: string
): number => {
  if (!targetDateStr || chartItems.length === 0) return -1;

  // 1. 完全一致チェック (MM/DD 形式)
  const parts = targetDateStr.split(/[-/]/);
  let formattedMMDD = targetDateStr;
  if (parts.length === 3) {
    formattedMMDD = `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
  } else if (parts.length === 2) {
    formattedMMDD = `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
  }

  const exactIndex = chartItems.findIndex((item) => item.date === formattedMMDD);
  if (exactIndex !== -1) return exactIndex;

  // 2. タイムスタンプでの最寄り検索（1週間おきのX軸上にマッピングするため）
  const baseParts = baseDateStr.split('-');
  const baseYear = parseInt(baseParts[0], 10) || new Date().getFullYear();

  let targetTime: number | null = null;
  if (parts.length === 3) {
    targetTime = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    ).getTime();
  } else if (parts.length === 2) {
    targetTime = new Date(
      baseYear,
      parseInt(parts[0], 10) - 1,
      parseInt(parts[1], 10)
    ).getTime();
  }

  if (!targetTime || isNaN(targetTime)) return -1;

  let minDiff = Infinity;
  let closestIndex = -1;

  chartItems.forEach((item, idx) => {
    const itemParts = item.date.split('/');
    if (itemParts.length === 2) {
      const itemTime = new Date(
        baseYear,
        parseInt(itemParts[0], 10) - 1,
        parseInt(itemParts[1], 10)
      ).getTime();

      const diff = Math.abs(itemTime - targetTime!);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    }
  });

  // 14日以内の最寄りデータポイントにマッピング
  if (minDiff <= 14 * 24 * 60 * 60 * 1000) {
    return closestIndex;
  }

  return -1;
};

/**
 * 看護管理者向け 業務改善・配置最適化ダッシュボード
 */
export default function AdminDashboard() {
  // Zustandから選択中の日付を取得（例: "2026-09-17"）
  const selectedDate = useTimelineStore((state) => state.selectedDate);
  // 日付が未選択の場合は今日の日付をデフォルトにする
  const displayDate = selectedDate || getJSTDateString();

  // 選択された時間帯スロットの状態 { day: "月", hour: "10時" } | null
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  // 選択状態の管理 (State) - label（曜日または部屋番号）、time（時間帯）、gapIndex（実質負荷）
  const [selectedCell, setSelectedCell] = useState<{ label: string; time: string; gapIndex: number } | null>(null);
  // 選択されたAIアクション提案（ヒント）の状態
  const [selectedHint, setSelectedHint] = useState<Hint | null>(null);
  // 画面・文字の表示拡大スケール (1: 標準, 1.15: 大, 1.3: 特大)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  // 特定セクションの全画面拡大状態 ('trend' | 'heatmap' | 'blocker' | 'hints' | null)
  const [expandedSection, setExpandedSection] = useState<
    'trend' | 'heatmap' | 'blocker' | 'hints' | null
  >(null);
  // AIモーダル内の師長の対応メモ・実行記録テキストの状態
  const [actionMemo, setActionMemo] = useState<string>('');
  // 新設：師長のマネジメント介入記録（直接入力テキストエリア）
  const [directInputMemo, setDirectInputMemo] = useState<string>('');
  // 新設：本日の介入・マネジメント対応履歴（タイムライン） State
  const [managementRecords, setManagementRecords] = useState<ManagementRecord[]>([
    {
      id: 'mock-1',
      slotLabel: '月曜 10:00枠',
      timestamp: '10:15',
      content: '田中さんに203室のヘルプを指示（検体採取サポート）',
      isAiBased: true,
    },
    {
      id: 'mock-2',
      slotLabel: '月曜 10:00枠',
      timestamp: '10:30',
      content: 'AさんとBさんの担当部屋を一部入れ替え（201号室↔205号室のADL負荷分散）',
      isAiBased: false,
    },
    {
      id: 'mock-3',
      slotLabel: '水曜 14:00枠',
      timestamp: '14:10',
      content: 'フリー担当ナース（佐藤）を全介助清拭の補助に緊急配置',
      isAiBased: true,
    },
  ]);

  // 保存中のローディング状態
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // トレンドデータ取得中のローディング状態
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  // ヒートマップ計算中のローディング状態
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState<boolean>(true);

  // ヒートマップ表示切り替え State ('day' | 'room')
  const [heatmapView, setHeatmapView] = useState<'day' | 'room'>('day');
  // それぞれの集計結果を保持する State
  const [heatmapDataDay, setHeatmapDataDay] = useState<HeatmapDay[]>([]);
  const [heatmapDataRoom, setHeatmapDataRoom] = useState<HeatmapDay[]>([]);

  // トレンドグラフデータ（TrendData[]）の State 管理
  const [chartData, setChartData] = useState<TrendData[]>([]);

  const shiftInfo: ShiftInfo = adminDashboardMock.shiftInfo;

  /**
   * Firestore からのデータ読み込みと 12週分トレンドデータの結合 (useEffect)
   */
  useEffect(() => {
    let isMounted = true;
    const fetchInterventionsAndBuildChart = async () => {
      setIsLoadingData(true);
      try {
        const baseChartData = generateBaseChartData(displayDate);

        try {
          const querySnapshot = await getDocs(collection(db, 'admin_interventions'));
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.target_date) {
              const noteText =
                data.memo && data.memo.trim()
                  ? data.memo.trim()
                  : data.action_title || '介入適用';

              const targetIndex = findClosestIndex(baseChartData, data.target_date, displayDate);
              if (targetIndex !== -1) {
                const existingItem = baseChartData[targetIndex];
                existingItem.hasIntervention = true;
                existingItem.interventionNote = existingItem.interventionNote
                  ? `${existingItem.interventionNote} / ${noteText}`
                  : noteText;
              }
            }
          });
        } catch (permissionErr) {
          console.warn('Firestore admin_interventions 権限制限。デフォルト動的データを使用します:', permissionErr);
        }

        if (isMounted) {
          setChartData(baseChartData);
        }
      } catch (error) {
        console.error('介入記録の処理エラー:', error);
        if (isMounted) {
          setChartData(generateBaseChartData(displayDate));
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchInterventionsAndBuildChart();

    return () => {
      isMounted = false;
    };
  }, [displayDate]);

  /**
   * 1回の通信で2パターンの集計を行う (useEffect内)
   * 「曜日×時間帯」および「部屋番号×時間帯」を同時に集計・構築
   */
  useEffect(() => {
    let isMounted = true;
    const fetchAndCalculateHeatmaps = async () => {
      setIsLoadingHeatmap(true);
      try {
        // ① 患者データ（patients）の取得
        const patientsMap: Record<string, any> = {};

        try {
          const patientsSnap = await getDocs(collection(db, 'patients'));
          patientsSnap.forEach((doc) => {
            const data = doc.data();
            const pId = data.patient_id || doc.id;
            if (pId) {
              patientsMap[pId] = data;
            }
          });
        } catch (permErr) {
          console.warn('patients コレクション権限制限。ローカル/ストアデータを使用します。');
        }

        if (Object.keys(patientsMap).length === 0) {
          try {
            const candidatePaths = ['/app/data/patients.json', '/data/patients.json'];
            for (const path of candidatePaths) {
              try {
                const res = await fetch(path);
                if (res.ok) {
                  const list = await res.json();
                  if (Array.isArray(list)) {
                    list.forEach((p: any) => {
                      const pId = p.patient_id || p.id;
                      if (pId) patientsMap[pId] = p;
                    });
                    break;
                  }
                }
              } catch (e) {
                // ignore
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // ② 部屋番号の配列（Y軸用ラベル）を patientsMap から動的に抽出・昇順ソート
        const extractedRooms = Array.from(
          new Set(
            Object.values(patientsMap)
              .map((p: any) => p.room_id || p.roomId || p.room)
              .filter(Boolean)
          )
        ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

        const roomIdsList = extractedRooms.length > 0 ? extractedRooms : ['201', '202', '203'];

        // ③ タスクデータ（tasks）の取得
        let tasksList: any[] = [];

        try {
          const tasksQuery1 = query(
            collection(db, 'tasks'),
            where('date', '==', displayDate)
          );
          const tasksSnap1 = await getDocs(tasksQuery1);
          tasksSnap1.forEach((doc) => tasksList.push({ ...doc.data(), task_id: doc.id }));
        } catch (e) {
          // ignore
        }

        if (tasksList.length === 0) {
          try {
            const tasksQuery2 = query(
              collection(db, 'tasks'),
              where('target_date', '==', displayDate)
            );
            const tasksSnap2 = await getDocs(tasksQuery2);
            tasksSnap2.forEach((doc) => tasksList.push({ ...doc.data(), task_id: doc.id }));
          } catch (e) {
            // ignore
          }
        }

        if (tasksList.length === 0) {
          try {
            const allTasksSnap = await getDocs(collection(db, 'tasks'));
            allTasksSnap.forEach((doc) => {
              const data = doc.data();
              tasksList.push({ ...data, task_id: doc.id });
            });
          } catch (permErr) {
            console.warn('tasks コレクション権限制限。ストア/ローカルデータを使用します。');
          }
        }

        if (tasksList.length === 0) {
          const storeTasks = useTimelineStore.getState().allTasks;
          if (Array.isArray(storeTasks) && storeTasks.length > 0) {
            tasksList = storeTasks;
          } else {
            try {
              const candidatePaths = ['/app/data/tasks.json', '/data/tasks.json'];
              for (const path of candidatePaths) {
                try {
                  const res = await fetch(path);
                  if (res.ok) {
                    const list = await res.json();
                    if (Array.isArray(list) && list.length > 0) {
                      tasksList = list;
                      break;
                    }
                  }
                } catch (e) {
                  // ignore
                }
              }
            } catch (e) {
              // ignore
            }
          }
        }

        // ④ 2パターンの集計（「曜日別」と「部屋別」）を同時に実行
        const loadMapDay: Record<string, Record<string, number>> = {};
        const taskTitlesDay: Record<string, Record<string, string[]>> = {};

        const loadMapRoom: Record<string, Record<string, number>> = {};
        const taskTitlesRoom: Record<string, Record<string, string[]>> = {};

        tasksList.forEach((task) => {
          const patientId = task.patient_id;
          const patient = patientsMap[patientId];

          const taskDate =
            task.date ||
            task.target_date ||
            task.targetDate ||
            task.scheduled_date ||
            (task.scheduled_at ? task.scheduled_at.split('T')[0].split(' ')[0] : displayDate);

          const taskTime =
            task.time ||
            task.scheduled_time ||
            (task.scheduled_at && task.scheduled_at.includes('T') ? task.scheduled_at.split('T')[1] : '') ||
            (task.scheduled_at && task.scheduled_at.includes(' ') ? task.scheduled_at.split(' ')[1] : '') ||
            task.display_period ||
            '';

          if (!patient || !taskDate || !taskTime) return;

          // 曜日判定
          const dateObj = new Date(taskDate);
          const daysMap = ["日", "月", "火", "水", "木", "金", "土"];
          const dayIndex = !isNaN(dateObj.getTime()) ? dateObj.getDay() : 4;
          const dayOfWeek = daysMap[dayIndex];

          // 時間丸め (例: "10:30" → "10時")
          let hourStr = '9時';
          const match = String(taskTime).match(/(\d{1,2})/);
          if (match) {
            hourStr = `${parseInt(match[1], 10)}時`;
          } else {
            hourStr = String(taskTime).substring(0, 2) + "時";
          }

          // 部屋番号
          const roomId = patient.room_id || task.room_id || '201';

          const adl = patient.adl || '自立';
          const riskLevel = patient.risk_level || '低';
          const taskTitle = task.title || task.details || '';

          // 重症度を考慮した実質負荷（分）の計算
          const loadMinutes = calculateTaskLoad(taskTitle, adl, riskLevel);

          // 1) 曜日別集計
          if (!loadMapDay[dayOfWeek]) loadMapDay[dayOfWeek] = {};
          if (!loadMapDay[dayOfWeek][hourStr]) loadMapDay[dayOfWeek][hourStr] = 0;
          loadMapDay[dayOfWeek][hourStr] += loadMinutes;

          if (!taskTitlesDay[dayOfWeek]) taskTitlesDay[dayOfWeek] = {};
          if (!taskTitlesDay[dayOfWeek][hourStr]) taskTitlesDay[dayOfWeek][hourStr] = [];
          if (taskTitle) taskTitlesDay[dayOfWeek][hourStr].push(taskTitle);

          // 2) 部屋別集計
          if (!loadMapRoom[roomId]) loadMapRoom[roomId] = {};
          if (!loadMapRoom[roomId][hourStr]) loadMapRoom[roomId][hourStr] = 0;
          loadMapRoom[roomId][hourStr] += loadMinutes;

          if (!taskTitlesRoom[roomId]) taskTitlesRoom[roomId] = {};
          if (!taskTitlesRoom[roomId][hourStr]) taskTitlesRoom[roomId][hourStr] = [];
          if (taskTitle) taskTitlesRoom[roomId][hourStr].push(taskTitle);
        });

        const timeSlots = ["8時", "9時", "10時", "11時", "12時", "13時", "14時", "15時", "16時", "17時", "18時", "19時", "20時"];
        const days = ["月", "火", "水", "木", "金", "土", "日"];
        const displayD = new Date(displayDate);
        const activeDayLabel = !isNaN(displayD.getTime()) ? ["日", "月", "火", "水", "木", "金", "土"][displayD.getDay()] : '木';

        // ⑤ 曜日別 HeatmapDay[] の構築 (キャパシティ上限 120分)
        const capacityLimitDay = 120;
        const generatedDayData: HeatmapDay[] = days.map((day) => {
          const hours: HeatmapHour[] = timeSlots.map((time) => {
            let totalMinutes = loadMapDay[day]?.[time] || 0;

            if (totalMinutes === 0 && (loadMapDay[activeDayLabel]?.[time] || 0) > 0) {
              const baseRef = loadMapDay[activeDayLabel][time];
              const mult = day === '月' || day === '木' ? 1.1 : day === '土' || day === '日' ? 0.5 : 0.9;
              totalMinutes = Math.round(baseRef * mult);
            }

            const gapIndex = Math.min(Math.round((totalMinutes / capacityLimitDay) * 100), 100);
            const titles = taskTitlesDay[day]?.[time] || taskTitlesDay[activeDayLabel]?.[time] || [];

            let riskFactor: string | undefined = undefined;
            if (gapIndex >= 75) {
              riskFactor = titles.length > 0 ? `${titles.slice(0, 2).join('・')}等の重症ケア競合` : '全介助・高リスク処置の集中';
            } else if (gapIndex >= 50) {
              riskFactor = '定期ケアと複数部屋の重複';
            }

            return {
              hour: time,
              intensity: gapIndex,
              taskCount: titles.length || (totalMinutes > 0 ? Math.ceil(totalMinutes / 15) : 0),
              riskFactor,
            };
          });

          return { day, hours };
        });

        // ⑥ 部屋別 HeatmapDay[] の構築 (個別キャパシティ上限 60分)
        const capacityLimitRoom = 60;
        const generatedRoomData: HeatmapDay[] = roomIdsList.map((room) => {
          const roomLabel = String(room);

          const hours: HeatmapHour[] = timeSlots.map((time) => {
            const totalMinutes = loadMapRoom[room]?.[time] || 0;
            const gapIndex = Math.min(Math.round((totalMinutes / capacityLimitRoom) * 100), 100);

            const titles = taskTitlesRoom[room]?.[time] || [];

            let riskFactor: string | undefined = undefined;
            if (gapIndex >= 75) {
              riskFactor = titles.length > 0 ? `${titles.slice(0, 2).join('・')}等の個別重症ケア` : '全介助・高負荷ケア重複';
            } else if (gapIndex >= 50) {
              riskFactor = '複数タスク重複時間帯';
            }

            return {
              hour: time,
              intensity: gapIndex,
              taskCount: titles.length || (totalMinutes > 0 ? Math.ceil(totalMinutes / 15) : 0),
              riskFactor,
            };
          });

          return { day: roomLabel, hours };
        });

        if (isMounted) {
          setHeatmapDataDay(generatedDayData);
          setHeatmapDataRoom(generatedRoomData);
        }
      } catch (error) {
        console.error("ヒートマップ計算フォールバック処理:", error);
        if (isMounted) {
          setHeatmapDataDay(adminDashboardMock.heatmapData);
          setHeatmapDataRoom(adminDashboardMock.heatmapData);
        }
      } finally {
        if (isMounted) {
          setIsLoadingHeatmap(false);
        }
      }
    };

    fetchAndCalculateHeatmaps();

    return () => {
      isMounted = false;
    };
  }, [displayDate]);

  /**
   * モーダルクローズ＆入力値リセット用ハンドラー
   */
  const handleCloseModal = () => {
    if (isSubmitting) return; // 送信中は閉じない
    setSelectedHint(null);
    setActionMemo('');
  };

  /**
   * ヒントカード選択用ハンドラー
   */
  const handleSelectHint = (hint: Hint) => {
    setSelectedHint(hint);
    setActionMemo('');
  };

  /**
   * AIモーダルからの保存ロジック (handleApplyAction)
   */
  const handleApplyAction = async () => {
    if (!selectedHint || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'admin_interventions'), {
        action_title: selectedHint.title,
        memo: actionMemo,
        target_date: displayDate, // 動的日付 data
        ward_id: shiftInfo.wardId,
        created_at: serverTimestamp(),
      });

      const noteText = actionMemo.trim() ? actionMemo.trim() : selectedHint.title;

      // チャートデータの更新
      setChartData((prevData) => {
        if (!prevData) return prevData;
        const newChartData = [...prevData];
        const targetIndex = findClosestIndex(newChartData, displayDate, displayDate);

        if (targetIndex !== -1) {
          const existingNote = newChartData[targetIndex].interventionNote;
          newChartData[targetIndex] = {
            ...newChartData[targetIndex],
            hasIntervention: true,
            interventionNote: existingNote
              ? `${existingNote} / ${noteText}`
              : noteText,
          };
        } else {
          const dateParts = displayDate.split('-');
          const formattedDate =
            dateParts.length === 3
              ? `${dateParts[1].padStart(2, '0')}/${dateParts[2].padStart(2, '0')}`
              : displayDate;
          newChartData.push({
            date: formattedDate,
            gapIndex: 70,
            hasIntervention: true,
            interventionNote: noteText,
          });
        }
        return newChartData;
      });

      // タイムライン対応履歴（managementRecords）にも追加
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentSlotLabel = selectedCell
        ? `${selectedCell.label}曜 ${selectedCell.time}枠`
        : selectedSlot
        ? `${selectedSlot.day}曜 ${selectedSlot.hour}枠`
        : '全体';

      const newMgmtRecord: ManagementRecord = {
        id: `ai-${Date.now()}`,
        slotLabel: currentSlotLabel,
        timestamp: timeStr,
        content: `【AI提案適用】${selectedHint.title}${actionMemo.trim() ? ` - ${actionMemo.trim()}` : ''}`,
        isAiBased: true,
      };
      setManagementRecords((prev) => [newMgmtRecord, ...prev]);

      alert('介入記録をデータベースに保存しました。');
      handleCloseModal();
    } catch (error) {
      console.error('Firestore介入記録の保存エラー:', error);
      alert('データベースへの保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 師長直接入力フォームからの「対応を記録する」ハンドラー
   */
  const handleSaveDirectIntervention = async () => {
    if (!directInputMemo.trim()) return;

    const currentSlotLabel = selectedCell
      ? `${selectedCell.label}曜 ${selectedCell.time}枠`
      : selectedSlot
      ? `${selectedSlot.day}曜 ${selectedSlot.hour}枠`
      : '全体';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: ManagementRecord = {
      id: `record-${Date.now()}`,
      slotLabel: currentSlotLabel,
      timestamp: timeStr,
      content: directInputMemo.trim(),
      isAiBased: false,
    };

    setManagementRecords((prev) => [newRecord, ...prev]);

    // Firestoreへの非同期保存
    try {
      await addDoc(collection(db, 'admin_interventions'), {
        action_title: '師長直接介入',
        memo: `[${currentSlotLabel}] ${directInputMemo.trim()}`,
        target_date: displayDate,
        ward_id: shiftInfo.wardId,
        created_at: serverTimestamp(),
      });

      setChartData((prevData) => {
        if (!prevData) return prevData;
        const newChartData = [...prevData];
        const targetIndex = findClosestIndex(newChartData, displayDate, displayDate);

        if (targetIndex !== -1) {
          const existingNote = newChartData[targetIndex].interventionNote;
          newChartData[targetIndex] = {
            ...newChartData[targetIndex],
            hasIntervention: true,
            interventionNote: existingNote
              ? `${existingNote} / ${directInputMemo.trim()}`
              : directInputMemo.trim(),
          };
        }
        return newChartData;
      });
    } catch (e) {
      console.warn('Firestoreへの直接介入保存フォールバック:', e);
    }

    // 入力リセット
    setDirectInputMemo('');
  };

  /**
   * ヒートマップのクリックイベントと選択UI
   */
  const handleCellClick = (day: string, hour: string, intensity?: number) => {
    if (
      (selectedCell?.label === day && selectedCell?.time === hour) ||
      (selectedSlot?.day === day && selectedSlot?.hour === hour)
    ) {
      setSelectedCell(null);
      setSelectedSlot(null);
    } else {
      let gapIndex = intensity;
      if (gapIndex === undefined) {
        const row = currentHeatmapData.find((r) => r.day === day);
        const hourItem = row?.hours.find((h) => h.hour === hour);
        gapIndex = hourItem ? hourItem.intensity : 75;
      }
      setSelectedCell({ label: day, time: hour, gapIndex });
      setSelectedSlot({ day, hour });
    }
  };

  /**
   * 選択解除（クリア）ハンドラー
   */
  const handleClearSelection = () => {
    setSelectedCell(null);
    setSelectedSlot(null);
  };

  /**
   * 右側パネル（遅延要因ドーナツグラフ）の連動
   */
  const activeBlockerData: BlockerData[] = selectedCell
    ? selectedCell.gapIndex >= 100
      ? [
          { name: '構造的競合', value: 80, color: '#EF4444' },
          { name: '他律的要因', value: 12, color: '#F59E0B' },
          { name: '自律的要因', value: 8, color: '#3B82F6' },
        ]
      : selectedCell.gapIndex >= 75
      ? [
          { name: '構造的競合', value: 75, color: '#EF4444' },
          { name: '他律的要因', value: 15, color: '#F59E0B' },
          { name: '自律的要因', value: 10, color: '#3B82F6' },
        ]
      : [
          { name: '構造的競合', value: 40, color: '#EF4444' },
          { name: '他律的要因', value: 35, color: '#F59E0B' },
          { name: '自律的要因', value: 25, color: '#3B82F6' },
        ]
    : selectedSlot
    ? [
        { name: '構造的競合', value: 75, color: '#EF4444' },
        { name: '他律的要因', value: 15, color: '#F59E0B' },
        { name: '自律的要因', value: 10, color: '#3B82F6' },
      ]
    : adminDashboardMock.blockerData;

  /**
   * 右側パネル（AIアクション提案）の連動
   */
  const activeHints: Hint[] = selectedCell
    ? [
        {
          optionId: 'SLOT_OPTION_A',
          title: `⚡️ 【選択中の枠に対する提案】${selectedCell.label} ${selectedCell.time}枠（負荷${selectedCell.gapIndex}%）`,
          description: `【選択中の枠に対する提案】${selectedCell.label}の${selectedCell.time}枠は実質負荷が${selectedCell.gapIndex}%に達しています。フリーナースの局所投入および全介助・重症ケアの優先サポート対応を推奨します。`,
          expectedImpact: `${selectedCell.label} ${selectedCell.time}枠の遅延リスク 85%削減`,
          riskFactor: '他エリアでの急変時サポート一時遅延リスク',
          estimatedCost: '＋1.2万円（時間外・応援手当換算、月間予算枠内）',
          staffBurden: 'フリー枠ナースの局所集中（他ナースの残業負荷 40%軽減）',
        },
        {
          optionId: 'SLOT_OPTION_B',
          title: `🔄 【タスク分散提案】${selectedCell.label} ${selectedCell.time}枠の前後シフト`,
          description: `【選択中の枠に対する提案】${selectedCell.label}の${selectedCell.time}枠（実質負荷${selectedCell.gapIndex}%）における時間指定のゆるいケア（清拭・準備等）を前後の枠へシフトし、ピーク負荷を平準化することを推奨します。`,
          expectedImpact: `${selectedCell.time}枠の業務密度を30%以上平準化`,
          riskFactor: '他時間帯の巡視・定期与薬との競合調整が必要',
          estimatedCost: '￥0（追加コストなし・既存シフト内で完結）',
          staffBurden: '前後の時間帯巡視担当者との事前ミーティング調整',
        },
      ]
    : selectedSlot
    ? [
        {
          optionId: 'SLOT_OPTION_A',
          title: `⚡️ 【${selectedSlot.day} ${selectedSlot.hour}限定】フリー担当の局所補テン`,
          description: `${selectedSlot.day} ${selectedSlot.hour}の時間帯にフリーナース1名を局所投入し、全介助・検体採取の重複をピンポイント解消します。`,
          expectedImpact: `${selectedSlot.day} ${selectedSlot.hour}枠の遅延リスク 85%削減`,
          riskFactor: '他エリアでの急変時サポート中断リスク',
          estimatedCost: '＋1.2万円（時間外・応援手当換算、月間予算枠内）',
          staffBurden: 'フリー枠ナースの局所集中（他ナースの残業負荷 40%軽減）',
        },
        {
          optionId: 'SLOT_OPTION_B',
          title: `🔄 【${selectedSlot.day} ${selectedSlot.hour}限定】タスクの前後分散シフト`,
          description: `時間指定のゆるいケア（清拭・処置準備）を14時台または前後の枠へシフトし、${selectedSlot.hour}台のピークを平準化します。`,
          expectedImpact: `${selectedSlot.hour}台の業務密度を平準化`,
          riskFactor: '他時間帯の巡視・定期与薬との競合調整が必要',
          estimatedCost: '￥0（追加コストなし・既存シフト内で完結）',
          staffBurden: '14時台の巡視担当者との事前ミーティング調整負荷',
        },
      ]
    : (adminDashboardMock.hints as Hint[]).map((hint, idx) => ({
        ...hint,
        estimatedCost:
          idx === 0 ? '￥0（既存チーム配置の再最適化）' : '＋0.8万円（応援手当算出）',
        staffBurden:
          idx === 0
            ? 'チーム全体の予定外残業を約1.5時間削減'
            : '日勤リーダーによる指示・巡回調整負荷がやや増加',
      }));

  // 現在アクティブなヒートマップデータ
  const currentHeatmapData = heatmapView === 'day' ? heatmapDataDay : heatmapDataRoom;

  // 選択枠に対応するレコードの抽出（選択枠がある場合は該当ラベルを含むもの優先）
  const activeSlotLabel = selectedCell
    ? `${selectedCell.label}曜 ${selectedCell.time}枠`
    : selectedSlot
    ? `${selectedSlot.day}曜 ${selectedSlot.hour}枠`
    : null;

  const currentSlotKeyword = selectedCell
    ? selectedCell.label
    : selectedSlot
    ? selectedSlot.day
    : '';

  const displayedRecords = activeSlotLabel
    ? managementRecords.filter(
        (r) => r.slotLabel.includes(currentSlotKeyword) || r.slotLabel === '全体'
      )
    : managementRecords;

  return (
    <div
      className="!w-full !h-full !min-h-0 !overflow-y-auto !bg-slate-100 !font-sans !p-2 lg:!p-2 !flex !flex-col !relative !transition-all !duration-300"
      style={{ zoom: zoomScale }}
    >
      {/* 1. ダッシュボードヘッダー */}
      <header className="shrink-0 mb-3 flex justify-between items-center border-b-2 border-slate-200 pb-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            業務改善・配置最適化ダッシュボード
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Nurse Optimizer 拡張版 - 終わらない課題への適応支援
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 【ズームコントロール】 */}
          <div className="!flex !items-center !gap-1 !bg-slate-200/80 !p-1.5 !rounded-xl !border !border-slate-300">
            <span className="!text-xs !font-extrabold !text-slate-700 !px-2 !flex !items-center !gap-1 !select-none">
              🔍 表示サイズ:
            </span>
            <button
              type="button"
              onClick={() => setZoomScale(1.0)}
              className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                zoomScale === 1.0
                  ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                  : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
              }`}
            >
              標準
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.15)}
              className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                zoomScale === 1.15
                  ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                  : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
              }`}
            >
              大 (+15%)
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.3)}
              className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                zoomScale === 1.3
                  ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                  : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
              }`}
            >
              特大 (+30%)
            </button>
          </div>

          {/* 右上ヘッダー表示 */}
          <div className="text-sm font-bold text-slate-800 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-300">
            📅 {displayDate} ({shiftInfo.shiftType}) | 🏥 {shiftInfo.wardId}
          </div>
        </div>
      </header>

      {/* 2. メイングリッドレイアウト */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* ================= 左側エリア (箱A + 箱B) ================= */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 h-full">
          
          {/* 箱A: トレンドグラフ */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <span className="mr-2 text-xl">📈</span> 病棟全体の負荷トレンドと介入の軌跡 (Past 3 Months)
                {isLoadingData && (
                  <span className="ml-2 text-xs text-blue-600 font-semibold animate-pulse">
                    (データ同期中...)
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setExpandedSection('trend')}
                className="!text-xs !font-extrabold !text-blue-700 hover:!text-blue-900 !bg-blue-50 hover:!bg-blue-100 !px-2.5 !py-1 !rounded-lg !border !border-blue-200 !transition-colors !flex !items-center !gap-1 !shrink-0"
                title="トレンドグラフを全画面拡大表示"
              >
                ⛶ 全画面拡大
              </button>
            </div>
            <div className="flex-1 min-h-0 w-full">
              <TrendLineChart data={chartData} />
            </div>
          </section>

          {/* 箱B: ヒートマップ（クリックインタラクション＆表示切り替え対応） */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <span className="mr-2 text-xl">🟥</span> ヒートマップ 
                  {isLoadingHeatmap && (
                    <span className="ml-2 text-xs text-blue-600 font-semibold animate-pulse">
                      (計算中...)
                    </span>
                  )}
                </h2>

                {/* 表示モード切替トグルボタン (曜日別 / 部屋別) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setHeatmapView('day')}
                    className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                      heatmapView === 'day'
                        ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                        : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
                    }`}
                  >
                    曜日別
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeatmapView('room')}
                    className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                      heatmapView === 'room'
                        ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                        : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
                    }`}
                  >
                    部屋別
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  💡 セルをクリックしてピンポイント分析
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedSection('heatmap')}
                  className="!text-xs !font-extrabold !text-blue-700 hover:!text-blue-900 !bg-blue-50 hover:!bg-blue-100 !px-2.5 !py-1 !rounded-lg !border !border-blue-200 !transition-colors !flex !items-center !gap-1 !shrink-0"
                  title="ヒートマップを全画面拡大表示"
                >
                  ⛶ 全画面拡大
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
              <OvercrowdedHeatmap
                data={currentHeatmapData}
                selectedSlot={selectedSlot}
                onCellClick={handleCellClick}
                yAxisTitle={heatmapView === 'day' ? '曜日' : '部屋'}
              />
            </div>
          </section>

        </div>

        {/* ================= 右側エリア (箱C + 箱D + 箱E) ================= */}
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-0 h-full overflow-y-auto pr-1">
          
          {/* 箱C: 要因分析 */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 shrink-0 flex flex-col relative min-h-[260px]">
            <div className="flex justify-between items-center mb-1 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                遅延要因 (Blocker)
              </h2>

              <div className="flex items-center gap-2">
                {selectedCell || selectedSlot ? (
                  <div className="flex items-center gap-1.5 bg-blue-100 border border-blue-300 px-3 py-1 rounded-lg text-xs animate-fade-in">
                    <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1">
                      <span className="text-sm">📍</span> {selectedCell ? `${selectedCell.label} ${selectedCell.time}` : `${selectedSlot?.day} ${selectedSlot?.hour}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="ml-1 text-blue-700 hover:text-blue-950 hover:bg-blue-200 px-2 py-0.5 rounded text-xs font-bold transition-colors border border-blue-300"
                      title="選択を解除して全期間表示に戻す"
                    >
                      解除 ✕
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-500">直近1週間平均</span>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedSection('blocker')}
                  className="!text-xs !font-extrabold !text-blue-700 hover:!text-blue-900 !bg-blue-50 hover:!bg-blue-100 !px-2.5 !py-1 !rounded-lg !border !border-blue-200 !transition-colors !flex !items-center !gap-1 !shrink-0"
                  title="遅延要因グラフを全画面拡大表示"
                >
                  ⛶ 拡大
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full h-[180px]">
              <BlockerPieChart data={activeBlockerData} />
            </div>

            <p className="text-xs font-bold text-red-700 bg-red-50 p-2.5 rounded-lg text-center shrink-0 mt-1 border border-red-200">
              {selectedCell
                ? `💡 【選択中の枠: ${selectedCell.label} ${selectedCell.time}】実質負荷${selectedCell.gapIndex}% - ${
                    selectedCell.gapIndex >= 100
                      ? '構造的競合（人員不足・重症度集中）が80%を占めています。'
                      : selectedCell.gapIndex >= 75
                      ? '構造的競合が75%に急増しています。'
                      : '各遅延要因が分散しています。'
                  }`
                : selectedSlot
                ? `💡 ${selectedSlot.day} ${selectedSlot.hour}は構造的競合が75%に急増しています。`
                : '💡 構造的競合が過半数 (60%) を占めています。'}
            </p>
          </section>

          {/* 箱D: AIインサイト（アクション検討提案） */}
          <section
            className="p-4 lg:p-5 rounded-2xl shadow-sm border-2 shrink-0 flex flex-col"
            style={{ backgroundColor: '#eff6ff', borderColor: '#93c5fd' }}
          >
            <div className="flex justify-between items-center mb-2.5 shrink-0">
              <h2 className="text-base lg:text-lg font-extrabold text-blue-950 flex items-center">
                <span className="mr-2 text-xl">🤖</span> AI アクション検討提案
              </h2>
              <div className="flex items-center gap-2">
                {(selectedCell || selectedSlot) && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="!text-xs !text-blue-800 hover:!text-blue-900 !font-bold !bg-white !px-2.5 !py-1 !rounded-lg !shadow-sm !border !border-blue-300 !transition-colors"
                  >
                    全体表示に戻す ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedSection('hints')}
                  className="!text-xs !font-extrabold !text-blue-700 hover:!text-blue-900 !bg-blue-50 hover:!bg-blue-100 !px-2.5 !py-1 !rounded-lg !border !border-blue-200 !transition-colors !flex !items-center !gap-1 !shrink-0"
                >
                  ⛶ 拡大
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {activeHints.map((hint) => (
                <button
                  key={hint.optionId}
                  type="button"
                  onClick={() => handleSelectHint(hint)}
                  style={{ backgroundColor: '#ffffff', borderColor: '#bfdbfe' }}
                  className="!w-full !text-left !p-3.5 !rounded-xl !shadow-sm !border-2 !transition-all !duration-200 hover:!shadow-md hover:!border-blue-400 hover:!bg-blue-50/60 !cursor-pointer !group"
                >
                  <div className="font-bold text-blue-950 text-xs lg:text-sm mb-1 group-hover:text-blue-800 flex items-center justify-between">
                    <span>{hint.title}</span>
                    <span className="text-xs text-blue-700 font-bold group-hover:underline shrink-0 ml-2">
                      詳細 ➔
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed font-medium">
                    {hint.description}
                  </div>
                  {hint.expectedImpact && (
                    <div className="mt-2 pt-1.5 border-t border-blue-100 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-900 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        ✨ 期待効果: {hint.expectedImpact}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* 箱E: マネジメント介入記録（対応入力・人間の決定事項） */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border-2 border-slate-300 shrink-0 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="text-lg">👔</span> マネジメント介入記録（対応入力）
              </h2>
              <span className="text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded shadow-xs">
                師長決定事項
              </span>
            </div>

            {/* 選択中の枠ラベル表示 */}
            {activeSlotLabel ? (
              <div className="mb-2 text-xs font-bold text-blue-950 bg-blue-50 border border-blue-200 p-2 rounded-xl flex justify-between items-center">
                <span>📍 対象枠: <strong>{activeSlotLabel}</strong></span>
                <span className="text-[10px] text-blue-700 font-medium">連動保存</span>
              </div>
            ) : (
              <div className="mb-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                💡 選択枠なし（病棟全体への対応として記録）
              </div>
            )}

            {/* 師長入力フォーム */}
            <div className="space-y-2">
              <textarea
                rows={3}
                value={directInputMemo}
                onChange={(e) => setDirectInputMemo(e.target.value)}
                placeholder="例: AIの提案通りフリー担当を配置 / AさんとBさんの担当部屋を一部入れ替え"
                className="w-full p-3 text-xs lg:text-sm font-medium text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-slate-700 focus:bg-white transition-all resize-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleSaveDirectIntervention}
                disabled={!directInputMemo.trim()}
                className={`w-full py-2.5 px-4 text-xs lg:text-sm font-extrabold text-white rounded-xl shadow-md border transition-all flex items-center justify-center gap-1.5 ${
                  directInputMemo.trim()
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-950 cursor-pointer active:scale-[0.99]'
                    : 'bg-slate-300 border-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <span>✍️</span> 対応を記録する
              </button>
            </div>

            {/* 本日の対応履歴 (タイムライン) */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center justify-between mb-2">
                <span className="flex items-center gap-1">
                  <span>📜</span> 本日の対応履歴（タイムライン）
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {displayedRecords.length} 件
                </span>
              </h3>

              {displayedRecords.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  選択中枠の対応履歴はありません
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {displayedRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between font-extrabold text-slate-700 mb-1">
                        <span className="text-[11px] text-slate-900 flex items-center gap-1">
                          <span className="text-slate-400">🕒</span> {rec.timestamp}
                          <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded text-[10px] ml-1">
                            {rec.slotLabel}
                          </span>
                        </span>
                        {rec.isAiBased && (
                          <span className="text-[9px] bg-blue-100 text-blue-900 border border-blue-300 px-1.5 py-0.2 rounded-full font-bold">
                            🤖 AI提案適用
                          </span>
                        )}
                      </div>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {rec.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* 3. AIアクション詳細モーダル */}
      {selectedHint && (
        <div
          className="!fixed !inset-0 !bg-black/50 !backdrop-blur-md !flex !items-center !justify-center !p-3 lg:!p-4 !z-50 animate-fade-in !overflow-hidden"
          onClick={handleCloseModal}
        >
          <div
            className="!max-w-lg !w-full !max-h-[85vh] !bg-white !rounded-2xl !shadow-2xl !overflow-hidden !flex !flex-col !border-2 !border-slate-300 !relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="!bg-slate-100 !border-b !border-slate-300 !p-4 lg:!p-5 !flex !items-start !justify-between !shrink-0">
              <div className="!flex !items-center !gap-3 !pr-2">
                <span className="!text-2xl lg:!text-3xl !shrink-0">🤖</span>
                <h3 className="!font-extrabold !text-slate-900 !text-base lg:!text-lg !leading-snug">
                  {selectedHint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="!text-slate-500 hover:!text-slate-800 hover:!bg-slate-200 !p-1.5 !rounded-xl !transition-colors !shrink-0 !text-base !font-extrabold disabled:!opacity-50"
                title="閉じる"
              >
                ✕
              </button>
            </div>

            {/* モーダル本文エリア */}
            <div className="!p-4 lg:!p-5 !space-y-4 !text-sm lg:!text-base !overflow-y-auto !flex-1 !min-h-0">
              {/* 概要・説明 */}
              <div>
                <h4 className="!text-xs !font-extrabold !text-slate-500 !uppercase !tracking-wider !mb-1">
                  📋 提案の概要・説明
                </h4>
                <p className="!text-slate-800 !leading-relaxed !font-medium !bg-slate-50 !p-3.5 !rounded-xl !border !border-slate-200 !text-xs lg:!text-sm">
                  {selectedHint.description}
                </p>
              </div>

              {/* 4つの評価視点（効果・リスク・コスト・現場負担） */}
              <div className="!space-y-2.5">
                <h4 className="!text-xs !font-extrabold !text-slate-500 !uppercase !tracking-wider !mb-1">
                  秤 アクション総合評価（4視点分析）
                </h4>

                {/* 1. 効果エリア */}
                {selectedHint.expectedImpact && (
                  <div className="!bg-green-50 !border-2 !border-green-300 !rounded-xl !p-3 lg:!p-3.5 !shadow-sm">
                    <div className="!flex !items-start !gap-2.5">
                      <span className="!text-xl !shrink-0">✨</span>
                      <div>
                        <span className="!block !text-[11px] !font-extrabold !text-green-900 !uppercase !tracking-wider">
                          期待される効果
                        </span>
                        <p className="!text-xs lg:!text-sm !font-bold !text-green-950 !leading-relaxed">
                          {selectedHint.expectedImpact}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. リスクエリア */}
                {selectedHint.riskFactor && (
                  <div className="!bg-amber-50 !border-2 !border-amber-300 !rounded-xl !p-3 lg:!p-3.5 !shadow-sm">
                    <div className="!flex !items-start !gap-2.5">
                      <span className="!text-xl !shrink-0">⚠️</span>
                      <div>
                        <span className="!block !text-[11px] !font-extrabold !text-amber-900 !uppercase !tracking-wider">
                          考慮すべきリスク・調整事項
                        </span>
                        <p className="!text-xs lg:!text-sm !font-bold !text-amber-950 !leading-relaxed">
                          {selectedHint.riskFactor}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. 経営・コスト視点 */}
                {selectedHint.estimatedCost && (
                  <div className="!bg-purple-50 !border-2 !border-purple-300 !rounded-xl !p-3 lg:!p-3.5 !shadow-sm">
                    <div className="!flex !items-start !gap-2.5">
                      <span className="!text-xl !shrink-0">💰</span>
                      <div>
                        <span className="!block !text-[11px] !font-extrabold !text-purple-900 !uppercase !tracking-wider">
                          経営・コスト視点
                        </span>
                        <p className="!text-xs lg:!text-sm !font-bold !text-purple-950 !leading-relaxed">
                          {selectedHint.estimatedCost}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. 現場の負担視点 */}
                {selectedHint.staffBurden && (
                  <div className="!bg-orange-50 !border-2 !border-orange-300 !rounded-xl !p-3 lg:!p-3.5 !shadow-sm">
                    <div className="!flex !items-start !gap-2.5">
                      <span className="!text-xl !shrink-0">🔋</span>
                      <div>
                        <span className="!block !text-[11px] !font-extrabold !text-orange-900 !uppercase !tracking-wider">
                          現場の負担・疲労度視点
                        </span>
                        <p className="!text-xs lg:!text-sm !font-bold !text-orange-950 !leading-relaxed">
                          {selectedHint.staffBurden}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 師長の対応メモ・実行記録フォームエリア */}
              <div className="!space-y-1.5 !pt-2">
                <label
                  htmlFor="action-memo-textarea"
                  className="!block !text-xs !font-extrabold !text-slate-700 !uppercase !tracking-wider"
                >
                  📝 師長の対応メモ・実行記録
                </label>
                <textarea
                  id="action-memo-textarea"
                  rows={3}
                  value={actionMemo}
                  disabled={isSubmitting}
                  onChange={(e) => setActionMemo(e.target.value)}
                  placeholder="例: 提案通りフリー担当の〇〇さんを配置。ただし10:30に一度状況報告を受ける。"
                  className="!w-full !p-3 !text-xs lg:!text-sm !font-medium !text-slate-800 !bg-gray-50 !border-2 !border-slate-300 !rounded-xl !focus:outline-none !focus:ring-2 !focus:ring-blue-500 !focus:border-blue-500 !transition-all !resize-none disabled:!opacity-50"
                />
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="!bg-slate-100 !border-t !border-slate-300 !p-3.5 lg:!p-4 !flex !justify-end !items-center !gap-3 !shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="!px-4 !py-2 !text-xs lg:!text-sm !font-bold !text-slate-700 hover:!text-slate-900 hover:!bg-slate-200 !rounded-xl !transition-colors !border-2 !border-slate-300 !bg-white !shadow-sm disabled:!opacity-50"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={handleApplyAction}
                disabled={isSubmitting}
                className={`!px-5 !py-2 !text-xs lg:!text-sm !font-extrabold !text-white !rounded-xl !transition-colors !shadow-md !border !border-blue-900 ${
                  isSubmitting
                    ? '!bg-blue-400 !cursor-not-allowed !opacity-70'
                    : '!bg-blue-700 hover:!bg-blue-800 !cursor-pointer'
                }`}
              >
                {isSubmitting ? '保存中...' : 'このアクションを適用'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. セクション全画面拡大表示モーダル */}
      {expandedSection && (
        <div
          className="!fixed !inset-0 !bg-black/60 !backdrop-blur-md !z-50 !p-4 lg:!p-8 !flex !flex-col animate-fade-in !overflow-hidden"
          onClick={() => setExpandedSection(null)}
        >
          <div
            className="!w-full !h-full !bg-white !rounded-3xl !shadow-2xl !p-6 lg:!p-8 !flex !flex-col !relative !overflow-hidden !border-2 !border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="!flex !justify-between !items-center !pb-4 !mb-4 !border-b !border-slate-200 !shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="!text-xl lg:!text-2xl !font-extrabold !text-slate-900 !flex !items-center !gap-2">
                  {expandedSection === 'trend' &&
                    '📈 病棟全体の負荷トレンドと介入の軌跡 (全画面表示)'}
                  {expandedSection === 'heatmap' &&
                    `🟥 ヒートマップ (${heatmapView === 'day' ? '曜日×時間帯' : '部屋番号×時間帯'}) (全画面表示)`}
                  {expandedSection === 'blocker' &&
                    '📊 遅延要因 (Blocker) 分析 (全画面表示)'}
                  {expandedSection === 'hints' && '🤖 AI アクション検討提案 (全画面表示)'}
                </h2>

                {expandedSection === 'heatmap' && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setHeatmapView('day')}
                      className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                        heatmapView === 'day'
                          ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                          : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
                      }`}
                    >
                      曜日別
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeatmapView('room')}
                      className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                        heatmapView === 'room'
                          ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                          : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
                      }`}
                    >
                      部屋別
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setExpandedSection(null)}
                className="!px-4 !py-2 !bg-slate-800 hover:!bg-slate-950 !text-white !font-extrabold !text-xs lg:!text-sm !rounded-xl !transition-all !shadow-md !flex !items-center !gap-1.5"
              >
                ✕ 元に戻す（全画面解除）
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="!flex-1 !min-h-0 !w-full !overflow-y-auto">
              {expandedSection === 'trend' && (
                <div className="!w-full !h-full !min-h-[500px]">
                  <TrendLineChart data={chartData} isExpanded={true} />
                </div>
              )}
              {expandedSection === 'heatmap' && (
                <div className="!w-full !h-full !min-h-[450px] !relative !overflow-visible">
                  <OvercrowdedHeatmap
                    data={currentHeatmapData}
                    selectedSlot={selectedSlot}
                    onCellClick={handleCellClick}
                    yAxisTitle={heatmapView === 'day' ? '曜日' : '部屋'}
                    isExpanded={true}
                  />
                </div>
              )}
              {expandedSection === 'blocker' && (
                <div className="!w-full !h-full !flex !flex-col !justify-center !items-center !min-h-[400px]">
                  <div className="!w-full !h-[450px]">
                    <BlockerPieChart data={activeBlockerData} isExpanded={true} />
                  </div>
                  <p className="!text-base lg:!text-lg !font-bold !text-red-700 !bg-red-50 !p-4 lg:!p-5 !rounded-2xl !border !border-red-200 !mt-6 !text-center !w-full !max-w-xl">
                    {selectedCell
                      ? `💡 【選択中の枠: ${selectedCell.label} ${selectedCell.time}】実質負荷${selectedCell.gapIndex}% - ${
                          selectedCell.gapIndex >= 100
                            ? '構造的競合（人員不足・重症度集中）が80%を占めています。'
                            : selectedCell.gapIndex >= 75
                            ? '構造的競合が75%に急増しています。'
                            : '各遅延要因が分散しています。'
                        }`
                      : selectedSlot
                      ? `💡 ${selectedSlot.day} ${selectedSlot.hour}は構造的競合が75%に急増しています。`
                      : '💡 構造的競合が過半数 (60%) を占めています。'}
                  </p>
                </div>
              )}
              {expandedSection === 'hints' && (
                <div className="!grid !grid-cols-1 md:!grid-cols-2 !gap-6 !p-3">
                  {activeHints.map((hint) => (
                    <button
                      key={hint.optionId}
                      type="button"
                      onClick={() => {
                        setExpandedSection(null);
                        handleSelectHint(hint);
                      }}
                      className="!w-full !text-left !p-6 !rounded-2xl !shadow-sm !border-2 !border-blue-200 !bg-white !transition-all !duration-200 hover:!shadow-md hover:!border-blue-400 hover:!bg-blue-50/60 !cursor-pointer"
                    >
                      <div className="!font-extrabold !text-blue-950 !text-lg lg:!text-xl !mb-3 !flex !items-center !justify-between">
                        <span>{hint.title}</span>
                        <span className="!text-sm lg:!text-base !text-blue-700 !font-bold !underline shrink-0 ml-2">
                          詳細を確認 ➔
                        </span>
                      </div>
                      <p className="!text-base lg:!text-lg !text-slate-700 !leading-relaxed !font-medium !mb-4">
                        {hint.description}
                      </p>
                      {hint.expectedImpact && (
                        <div className="!pt-3 !border-t !border-blue-100">
                          <span className="!text-sm lg:!text-base !text-emerald-900 !font-extrabold !bg-emerald-100 !px-4 !py-2 !rounded-xl !border !border-emerald-300 !inline-block">
                            ✨ 期待効果: {hint.expectedImpact}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}