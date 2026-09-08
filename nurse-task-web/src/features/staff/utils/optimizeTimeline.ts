import type { EMRTask, UserMemo, AnchorCluster, TimelineOptimizationResult } from '../../../types/anchorMemo';

/**
 * 部屋の隣接判定マップ（簡易版）
 * 同じ部屋、または近接部屋（例: 203室に対して 201, 202, 204）
 */
const ROOM_PROXIMITY_MAP: Record<string, string[]> = {
  '203': ['203', '201', '202', '204'],
  '202': ['202', '201', '203'],
  '201': ['201', '202', '203'],
  '204': ['204', '203', '205'],
};

/**
 * 時刻文字列 "HH:mm" を分（00:00からの経過分数）に変換
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 分数を "HH:mm" 文字列に変換
 */
function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * optimizeTimeline
 * 特定の部屋に設定されたレッドアンカーメモ（例: 203室 10:30）を軸に、
 * 同室・隣接室の未割り当て (status: 'pool') タスクを10:15〜10:30枠へ最適化クラスタリング提案する。
 */
export function optimizeTimeline(
  tasks: EMRTask[],
  memos: UserMemo[]
): TimelineOptimizationResult {
  // 1. レッドメモかつアンカー指定されている未完了メモを抽出
  const anchorMemos = memos.filter(
    (m) => m.isAnchor && m.color === 'red' && !m.isCompleted
  );

  const poolTasks = tasks.filter((t) => t.status === 'pool');
  const assignedTaskIds = new Set<string>();

  const clusters: AnchorCluster[] = anchorMemos.map((anchor) => {
    const anchorTimeMinutes = timeToMinutes(anchor.time);
    // アンカー時刻の15分前からアンカー時刻までを実行枠として提示 (例: 10:15〜10:30)
    const windowStartMinutes = Math.max(0, anchorTimeMinutes - 15);
    const startTimeStr = minutesToTime(windowStartMinutes);
    const endTimeStr = anchor.time;

    // 隣接部屋のリストを取得
    const nearbyRooms = ROOM_PROXIMITY_MAP[anchor.roomId] || [anchor.roomId];

    // 同一部屋および近接部屋の pool タスクを抽出
    const matchedTasks = poolTasks.filter((task) => {
      if (assignedTaskIds.has(task.id)) return false;
      return nearbyRooms.includes(task.roomId);
    });

    // ソート条件: ①同一部屋を最優先 -> ②優先度(high > medium > low) -> ③所要時間が短い順
    matchedTasks.sort((a, b) => {
      const aSameRoom = a.roomId === anchor.roomId ? 1 : 0;
      const bSameRoom = b.roomId === anchor.roomId ? 1 : 0;
      if (aSameRoom !== bSameRoom) return bSameRoom - aSameRoom;

      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.estimatedMinutes - b.estimatedMinutes;
    });

    // 枠時間（目安15〜20分以内）に収まるようクラスタリング
    const selectedTasks: EMRTask[] = [];
    let currentTotalMinutes = 0;
    const MAX_CLUSTER_MINUTES = 20;

    for (const task of matchedTasks) {
      if (currentTotalMinutes + task.estimatedMinutes <= MAX_CLUSTER_MINUTES) {
        selectedTasks.push(task);
        assignedTaskIds.add(task.id);
        currentTotalMinutes += task.estimatedMinutes;
      }
    }

    const sameRoomCount = selectedTasks.filter((t) => t.roomId === anchor.roomId).length;
    const reasonText = `${anchor.roomId}号室の【絶対約束メモ】(${anchor.time}「${anchor.text}」)の訪室に合わせて、ついでに完了できる${sameRoomCount}件の未指定タスクを同枠(${startTimeStr}〜${endTimeStr})にサジェスト。`;

    return {
      anchorMemo: anchor,
      suggestedTimeWindow: {
        startTime: startTimeStr,
        endTime: endTimeStr,
      },
      suggestedTasks: selectedTasks,
      totalEstimatedMinutes: currentTotalMinutes,
      reason: reasonText,
    };
  });

  const unclusteredTasks = tasks.filter((t) => !assignedTaskIds.has(t.id));

  return {
    clusters,
    unclusteredTasks,
    allMemos: memos,
  };
}
