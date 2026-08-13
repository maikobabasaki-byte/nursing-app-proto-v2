import { useEffect } from 'react';
import { create } from 'zustand';

export type AppTheme = 'vital' | 'serene' | 'dark';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  subtitle: string;
  description: string;
  targetUnit: string;
  mainColor: string;
  accentColor: string;
  bgColor: string;
  cardBg: string;
  textColor: string;
}

export const THEME_CONFIGS: Record<AppTheme, ThemeConfig> = {
  vital: {
    id: 'vital',
    name: 'Vital & Focus',
    subtitle: '集中型 / 急性期・ICU向け',
    description: '爽やかな薄い水色とディープネイビーによる清潔感と高い視認性で、臨床現場での迅速な意思決定と高い集中力をサポートします。',
    targetUnit: '急性期病棟 / ICU / HCU / 救急外来',
    mainColor: '#BAE6FD',
    accentColor: '#1A365D',
    bgColor: '#F0F4F8',
    cardBg: '#FFFFFF',
    textColor: '#0F172A',
  },
  serene: {
    id: 'serene',
    name: 'Serene & Calm',
    subtitle: '安定型 / 療養・リハビリ向け',
    description: '優しいセージグリーンとサンドベージュで、患者と看護師の双方に安心感とリラックスをもたらし長時間の業務疲労を和らげます。',
    targetUnit: '療養病棟 / リハビリテーション病棟 / 緩和ケア',
    mainColor: '#4A7C59',
    accentColor: '#FAF3E0',
    bgColor: '#F4F1EA',
    cardBg: '#FAF8F5',
    textColor: '#2C3E2E',
  },
  dark: {
    id: 'dark',
    name: 'Dark Mode',
    subtitle: '夜間対応型 / 全病棟・夜勤帯向け',
    description: 'ミッドナイトブラックと目に優しいミントグリーンで、暗い病室での画面の眩しさを防ぎ夜間巡視時の視力順応を保ちます。',
    targetUnit: '全病棟（夜勤帯） / ナースステーション夜間点灯時',
    mainColor: '#0F172A',
    accentColor: '#2DD4BF',
    bgColor: '#090D16',
    cardBg: '#1E293B',
    textColor: '#F8FAFC',
  },
};

const STORAGE_KEY = 'nursing_app_theme';

const getInitialTheme = (): AppTheme => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'vital' || saved === 'serene' || saved === 'dark')) {
      return saved as AppTheme;
    }
  }
  return 'vital';
};

interface ThemeState {
  theme: AppTheme;
  changeTheme: (newTheme: AppTheme) => void;
}

// 🌐 アプリ全体で唯一のテーマ状態を保持・配信する Zustand ストア
export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  changeTheme: (newTheme: AppTheme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    set({ theme: newTheme });
  },
}));

// 🎨 カスタムフック:useTheme (全コンポーネントがリアルタイム同期)
export const useTheme = () => {
  const theme = useThemeStore((state) => state.theme);
  const changeTheme = useThemeStore((state) => state.changeTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme,
    currentConfig: THEME_CONFIGS[theme],
    changeTheme,
  };
};
