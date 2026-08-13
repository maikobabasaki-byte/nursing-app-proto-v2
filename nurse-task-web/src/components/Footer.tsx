import { useTheme } from '../hooks/useTheme';

export default function Footer() {
  const { currentConfig } = useTheme();

  return (
    <footer
      className="min-h-[6vh] w-full flex justify-center items-center border-t border-white/10 transition-colors duration-300 shrink-0"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      <p
        className="text-center text-sm font-bold opacity-90 transition-colors duration-300"
        style={{ color: currentConfig.accentColor }}
      >
        © 2026 NurseFlowApp
      </p>
    </footer>
  );
}