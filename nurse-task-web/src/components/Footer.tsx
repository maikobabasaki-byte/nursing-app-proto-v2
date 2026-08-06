export default function Footer() {
  return (
    <footer className="theme-header min-h-[6vh] w-full flex justify-center border-t border-current/10 transition-colors duration-300">
      {/* 画面に文字を出したい場合はここに書きます */}
      <p className="text-center text-sm font-medium opacity-80 leading-[6vh]">
        © 2026 NurseFlowApp
      </p>
    </footer>
  );
}