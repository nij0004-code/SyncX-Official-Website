import { Bot } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative py-12 px-6 bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and name */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-3 rounded-xl border border-white/10">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Scripts Twin</span>
          </div>

          {/* Copyright and Credits */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-zinc-500 text-sm">
              © {new Date().getFullYear()} Scripts Twin. All rights reserved.
            </div>
            <div className="text-zinc-600 text-xs">
              Credits: <span className="text-zinc-500">fivexscripts</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm text-zinc-400">
            <a
              href="https://discord.com/oauth2/authorize?client_id=1461151623744065618"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-300"
            >
              Add Bot
            </a>
            <a
              href="https://twin--tallbold46.replit.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-300"
            >
              Website
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}