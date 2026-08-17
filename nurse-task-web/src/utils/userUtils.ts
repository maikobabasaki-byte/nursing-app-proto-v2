/**
 * 👤 ユーザーID・メール・マスタープロファイルから、自然な日本語名とリーダー権限を決定する共通ユーティリティ
 */

export interface NurseProfile {
  nurse_id: string;
  name: string;
  email: string;
  team: string;
  is_leader: boolean;
}

export function resolveNurseProfile(id: string, email: string, data?: any): NurseProfile {
  const cleanId = (id || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  const emailPrefix = cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail;
  const lookupKey = cleanId || emailPrefix;

  // 🎯 既知のスタッフID・メールアドレスから日本語表示名と権限を自動マッピング
  const knownMap: Record<string, { name: string; is_leader: boolean; team: string }> = {
    'leader': { name: '山田 リーダー', is_leader: true, team: 'Aチーム' },
    'leader01': { name: '山田 リーダー', is_leader: true, team: 'Aチーム' },
    'nurse01': { name: '山田 リーダー', is_leader: true, team: 'Aチーム' },
    'nurse1': { name: '山田 リーダー', is_leader: true, team: 'Aチーム' },
    'nurse-1': { name: '山田 リーダー', is_leader: true, team: 'Aチーム' },
    'nurse02': { name: '佐藤 看護師', is_leader: false, team: 'Aチーム' },
    'nurse2': { name: '佐藤 看護師', is_leader: false, team: 'Aチーム' },
    'nurse-2': { name: '佐藤 看護師', is_leader: false, team: 'Aチーム' },
    'nurse03': { name: '鈴木 看護師', is_leader: false, team: 'Bチーム' },
    'nurse3': { name: '鈴木 看護師', is_leader: false, team: 'Bチーム' },
    'nurse-3': { name: '鈴木 看護師', is_leader: false, team: 'Bチーム' },
    'nurse04': { name: '高橋 看護師', is_leader: false, team: 'Bチーム' },
    'nurse4': { name: '高橋 看護師', is_leader: false, team: 'Bチーム' },
    'nurse-4': { name: '高橋 看護師', is_leader: false, team: 'Bチーム' },
  };

  const known = knownMap[lookupKey] || knownMap[cleanId] || knownMap[emailPrefix];

  let name = data?.name;
  let is_leader = data?.is_leader;
  let team = data?.team;

  // 💡 もし name が未登録、またはIDそのまま（例: "nurse01", "leader"）の場合は日本語名に変換
  if (!name || name === cleanId || name === email || name === emailPrefix || name.match(/^(nurse|leader|user)\d*$/i)) {
    if (known) {
      name = known.name;
    } else if (lookupKey.includes('leader') || lookupKey.includes('head')) {
      name = `${lookupKey.replace(/^(nurse|user)_?/, '').toUpperCase()} リーダー`;
    } else {
      name = `看護師 ${lookupKey.replace(/^(nurse|user)_?/, '').toUpperCase()}`;
    }
  }

  if (typeof is_leader !== 'boolean') {
    if (known) {
      is_leader = known.is_leader;
    } else {
      is_leader = lookupKey.includes('leader') || lookupKey.includes('head') || lookupKey === 'nurse01';
    }
  }

  if (!team && known) {
    team = known.team;
  }

  return {
    nurse_id: id || lookupKey,
    name: name || '看護師',
    email: email || `${lookupKey}@nurseflow.local`,
    team: team || 'Aチーム',
    is_leader: Boolean(is_leader),
  };
}

/**
 * 👑 アカウントがリーダー権限を持っているかを判定する堅牢な共通関数
 */
export function checkIsLeader(currentUser: any): boolean {
  const guestRole = sessionStorage.getItem('nurseflow_guest_role');
  if (guestRole === 'leader') return true;
  if (!currentUser) return false;
  if (currentUser.is_leader === true) return true;

  const id = String(currentUser.nurse_id || currentUser.email || currentUser.name || '').toLowerCase();
  return id.includes('leader') || id.includes('head') || id === 'nurse01' || id === 'nurse-1';
}
