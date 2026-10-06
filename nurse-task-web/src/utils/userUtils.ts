/**
 * 👤 ユーザーID・メール・マスタープロファイルから、自然な日本語名とリーダー権限を決定する共通ユーティリティ
 */

export interface NurseProfile {
  nurse_id: string;
  name: string;
  email: string;
  team: string;
  is_leader: boolean;
  role: 'admin' | 'nurse';
}

export function resolveNurseProfile(id: string, email: string, data?: any): NurseProfile {
  const cleanId = (id || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  const emailPrefix = cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail;
  const lookupKey = cleanId || emailPrefix;

  // 🎯 既知のスタッフID・メールアドレスから日本語表示名と権限を自動マッピング
  const knownMap: Record<string, { name: string; is_leader: boolean; team: string; role?: 'admin' | 'nurse' }> = {
    'admin01': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'admin': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'leader': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'leader01': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'nurse01': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'nurse1': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'nurse-1': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'ono': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'leader_ono': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'ono_head': { name: '山田 師長', is_leader: true, team: '全体', role: 'admin' },
    'nurse05': { name: '田中 結衣', is_leader: false, team: 'Aチーム', role: 'nurse' },
    'nurse02': { name: '佐藤 看護師', is_leader: false, team: 'Aチーム', role: 'nurse' },
    'nurse2': { name: '佐藤 看護師', is_leader: false, team: 'Aチーム', role: 'nurse' },
    'nurse-2': { name: '佐藤 看護師', is_leader: false, team: 'Aチーム', role: 'nurse' },
    'nurse03': { name: '鈴木 看護師', is_leader: false, team: 'Bチーム', role: 'nurse' },
    'nurse3': { name: '鈴木 看護師', is_leader: false, team: 'Bチーム', role: 'nurse' },
    'nurse-3': { name: '鈴木 看護師', is_leader: false, team: 'Bチーム', role: 'nurse' },
    'nurse04': { name: '高橋 看護師', is_leader: false, team: 'Bチーム', role: 'nurse' },
    'nurse4': { name: '高橋 看護師', is_leader: false, team: 'Bチーム', role: 'nurse' },
    'nurse-4': { name: '高橋 看護師', is_leader: false, team: 'Bチーム', role: 'nurse' },
  };

  const known = knownMap[lookupKey] || knownMap[cleanId] || knownMap[emailPrefix];

  let name = data?.name;
  let is_leader = data?.is_leader;
  let team = data?.team;
  let role: 'admin' | 'nurse' = data?.role;

  // 💡 もし name が未登録、またはIDそのまま（例: "nurse01", "leader"）の場合は日本語名に変換
  if (!name || name === cleanId || name === email || name === emailPrefix || name.match(/^(nurse|leader|user)\d*$/i)) {
    if (known) {
      name = known.name;
    } else if (lookupKey.includes('leader') || lookupKey.includes('head') || lookupKey.includes('admin')) {
      name = `${lookupKey.replace(/^(nurse|user)_?/, '').toUpperCase()} 師長`;
    } else {
      name = `看護師 ${lookupKey.replace(/^(nurse|user)_?/, '').toUpperCase()}`;
    }
  }

  if (typeof is_leader !== 'boolean') {
    if (known) {
      is_leader = known.is_leader;
    } else {
      is_leader = lookupKey.includes('leader') || lookupKey.includes('head') || lookupKey.includes('admin') || lookupKey === 'nurse01';
    }
  }

  if (!role) {
    if (known?.role) {
      role = known.role;
    } else {
      role = is_leader || lookupKey.includes('admin') || lookupKey.includes('leader') || cleanId === 'nurse01' ? 'admin' : 'nurse';
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
    role: role,
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

/**
 * 📱 ブラウザ端末/タブごとにユニークなセッションIDを取得（SOS自他判定用）
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let sid = sessionStorage.getItem('nurseflow_client_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    sessionStorage.setItem('nurseflow_client_session_id', sid);
  }
  return sid;
}

export interface StaffCandidateOption {
  id: string;
  name: string;
  roleLabel: string;
  isLeader: boolean;
}

/**
 * 🏥 システム内のデモ用標準スタッフおよび実データ登録ユーザーを結合して候補リストを生成
 */
export function getStaffCandidates(
  nurseMaster?: any[],
  nurses?: any[],
  currentUser?: any
): StaffCandidateOption[] {
  const options: StaffCandidateOption[] = [
    { id: 'N001', name: '山田 師長', roleLabel: '師長・管理者', isLeader: true },
    { id: 'N002', name: '田中 結衣', roleLabel: '1年目ナース', isLeader: false },
    { id: 'N003', name: '鈴木 看護師', roleLabel: '4年目・プリセプター', isLeader: false },
    { id: 'N004', name: '高橋 看護師', roleLabel: '1年目ナース', isLeader: false },
    { id: 'N005', name: '佐藤 看護師', roleLabel: '1年目ナース', isLeader: false },
  ];

  const seenIds = new Set<string>(options.map((o) => o.id.toLowerCase()));
  ['admin01', 'nurse01', 'nurse02', 'nurse03', 'nurse04', 'nurse05', 'n001', 'n002', 'n003', 'n004', 'n005', 'n1', 'n2', 'n3', 'n4', 'n5'].forEach((alias) =>
    seenIds.add(alias)
  );

  const addIfNew = (id: string, name: string, isLeader: boolean, team?: string) => {
    const cleanId = (id || '').trim();
    if (!cleanId || seenIds.has(cleanId.toLowerCase())) return;
    seenIds.add(cleanId.toLowerCase());

    const roleLabel = isLeader ? '管理者（実ユーザー）' : `${team || '一般看護師'}（実ユーザー）`;

    options.push({
      id: cleanId,
      name: name || `看護師 (${cleanId})`,
      roleLabel,
      isLeader,
    });
  };

  if (currentUser) {
    const curId = currentUser.nurse_id || currentUser.staff_id || currentUser.id;
    if (curId) {
      addIfNew(curId, currentUser.name, checkIsLeader(currentUser), currentUser.team);
    }
  }

  if (Array.isArray(nurseMaster)) {
    nurseMaster.forEach((nm) => {
      if (nm.nurse_id) {
        addIfNew(nm.nurse_id, nm.name, Boolean(nm.is_leader), nm.team);
      }
    });
  }

  if (Array.isArray(nurses)) {
    nurses.forEach((n) => {
      if (n.nurse_id) {
        addIfNew(n.nurse_id, n.name, Boolean(n.is_leader), n.team);
      }
    });
  }

  return options;
}
