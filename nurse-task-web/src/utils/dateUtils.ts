/**
 * 日本時間 (JST / UTC+9) に関する日付・時刻ヘルパーユーティリティ
 */

/**
 * 現在の日本時間の日付文字列 (YYYY-MM-DD) を取得します。
 */
export const getJSTDateString = (dateInput: Date = new Date()): string => {
  // Asia/Tokyo タイムゾーンで YYYY-MM-DD 形式を取得
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(dateInput);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
};

/**
 * 現在の日本時間の日時文字列 (YYYY-MM-DD HH:mm:ss) を取得します。
 */
export const getJSTDateTimeString = (dateInput: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(dateInput);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

/**
 * ISO 形式の日本時間文字列 (YYYY-MM-DDTHH:mm:ss+09:00) を取得します。
 */
export const getJSTISOString = (dateInput: Date = new Date()): string => {
  const dateTimeStr = getJSTDateTimeString(dateInput);
  const [datePart, timePart] = dateTimeStr.split(' ');
  return `${datePart}T${timePart}+09:00`;
};
