import type{ ExtendedTask } from '../types/types';

export const getTaskStyles = (task: ExtendedTask, isPastTime: (period: string) => boolean) => {
  const isRecordDone = task.status === 'record_complete';
  const isActionRequiredDone = ['completed', 'record_start', 'record_pending'].includes(task.status);

  let cardColorClass = '';

  // 1. 📂 親グループカード（アコーディオンを閉じてる状態）のベースカラー
  if (task.isGroup && !task.isChild) {
    // 💡 親カード自体が「すべて完了」なら、親の見た目も一緒にグレーアウトさせる
    if (isRecordDone) {
      cardColorClass = 'bg-slate-800 border-slate-700 text-slate-400 line-through';
    } else {
      cardColorClass = 'bg-[#1e3a6a] border-[#1e3a6a] text-white';
    }
  } 
  //  🛑 払い出し不可・不実施タスク
  else if (task.status === 'unexecuted') {
    cardColorClass = 'bg-gray-800 border-gray-700 text-gray-500 line-through opacity-60';
  } 
  //  🟠 中断・保留中
  else if (task.status === 'pending') {
    cardColorClass = 'bg-orange-400 border-orange-300 text-gray-900';
  } 
  // 記録まで「すべて完了」した子タスクのカラー
  else if (isRecordDone) {
   // 🎨 親の紺色と完全に分離！「薄いグレー」の背景に、文字は「読める濃さのグレー」
    cardColorClass = 'bg-gray-200 border-gray-300 text-gray-500';
  } 
  //  🔵🟢🟠 処置は終わったが「記録がまだ」の子タスクのカラー
  else if (isActionRequiredDone) {
    // 💡 完全に終わった薄グレー（gray-200）と区別するため、少しだけ濃いめのグレーに。
    // 記録を促すために文字はハッキリした黒に近いグレー（text-gray-800）にします
    cardColorClass = 'bg-gray-300 border-gray-200 text-gray-800';
  } 
  //  未着手（通常タスクの優先度別カラー）
  else {
    const priorityColors = {
      high: 'bg-red-300 border-red-200 text-gray-900',
      medium: 'bg-green-300 border-green-200 text-gray-900',
      low: 'bg-blue-300 border-blue-200 text-gray-900',
    };
    cardColorClass = priorityColors[task.priority as 'high' | 'medium' | 'low'] || 'bg-white border-gray-200 text-gray-800';
  }

  // 🚨 遅れ（未実施のまま時間を過ぎた）の判定
  const isProgressing = task.status === 'progressing';
  const isOverdue = isPastTime(task.display_period) && 
                    !isRecordDone && 
                    !isActionRequiredDone && 
                    task.status !== 'unexecuted'; 

  const borderStyle = isProgressing
    ? '!border-2 !border-blue-600 shadow-md scale-[1.01]'
    : isOverdue 
      ? '!border-2 !border-red-600 shadow-md shadow-red-100'
      : 'border';

  return { cardColorClass, borderStyle };
};