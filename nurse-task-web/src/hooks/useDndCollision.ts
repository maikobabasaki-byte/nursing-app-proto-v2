import { pointerWithin } from '@dnd-kit/core';
import type{ CollisionDetection } from '@dnd-kit/core';

/**
 * ドラッグ＆ドロップ時の衝突検知（ドロップ先エリアの判定）を制御するカスタムフック。
 * * @description
 * 掴んでいるアイテムが「タスク」か「メモ」かに応じて、反応すべきドロップ先をリアルタイムに仕分けます。
 * これにより、タスクをメモエリアに誤って落とすなどの現場での誤操作を未然に防ぎます。
 */
export function useDndCollision() {
  /**
   * マウスのポインター（矢印の先端）を基準にドロップ先を計算する特製ルール。
   * * @description
   * 掴んでいるアイテムが「メモ」なのか「タスク」なのかを判断し、
   * それに応じて反応すべきドロップ先（ターゲット）の電波を裏側で自動的に切り替えます。
   * * @param args - dnd-kitから渡される衝突検知用の引数
   */
  const customCollisionDetection: CollisionDetection = (args) => {
    // active：現在ユーザーがドラッグ（クリックして移動）しているアイテムの情報が入っています。
    const { active } = args;
    // 1. 【安全装置】現在何も掴んでいない（ドラッグしていない）場合は、計算せずに処理を終了する
    if (!active) return [];
    
    // 2. 【IDの文字列化】掴んでいるアイテムの固有ID（例: "memo-001" や "task-102"）を取り出し、文字として扱いやすいように文字列型に変換
    const draggedId = String(active.id);

    // ==========================================
    //  1. ドラッグ中のアイテムが「メモ」の場合
    // ==========================================
                  // .startsWith('memo-')：「もしこの文字列は memo- から始まっているなら」
    if (draggedId.startsWith('memo-')) {
      // args.droppableContainers：画面内にある、「アイテムを落とせる場所（マスやエリア）」の全リスト
      const memoTargets = args.droppableContainers.filter((container) => {
        const idStr = String(container.id);
        // idStr.startsWith('memo-drop-')：IDが「memo-drop-」から始まる、メモ専用の保管エリアもしくはidStr.includes(':')：「09:30」のようにコロンが含まれる、タイムラインの時間枠のマス。
        return idStr.startsWith('memo-drop-') || idStr.includes(':');
      });
      // pointerWithin：dnd-kitが提供する関数で、「マウスポインター（矢印の先端）がそのエリアの内側に入っているか」を計算
      return pointerWithin({
        ...args,// 元々あった細かい設定をすべてここに丸ごとコピーして広げる
        droppableContainers: memoTargets,// ドロップ先のリストだけを、新しく絞り込んだやつに上書きする
      });
    }

    // 2. ドラッグ中のアイテムが「タスク」の場合
    // メモ専用のドロップ先（memo-drop-から始まるエリア）を完全に除外する
    const taskTargets = args.droppableContainers.filter((container) => {
      return !String(container.id).startsWith('memo-drop-');
    });

    return pointerWithin({
      ...args,
      droppableContainers: taskTargets,
    });
  };

  return { customCollisionDetection };
}