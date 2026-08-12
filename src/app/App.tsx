import { useState } from "react";
import { Code2, Home, ScrollText, Users, Copy, Check, Zap, Globe, Shield, ArrowRight, ExternalLink, ChevronRight, Star, Layers, MousePointer, Eye, Box, Lock, Sparkles, BookOpen, Terminal, Chrome, Star as StarIcon, AlertTriangle } from "lucide-react";
import epScript from "@/imports/pasted_text/education-perfect-hack-user.js?raw";
import blooketScript from "@/imports/pasted_text/blooket-gui-mod.js?raw";
import blooketSyncScript from "@/imports/pasted_text/blooket-cheats.js?raw";
import aimScript from "@/imports/pasted_text/1v1-aimbot-esp.js?raw";
import buildnowScript from "@/imports/pasted_text/buildnowgg-gui.js?raw";
import cookieScript from "@/imports/pasted_text/cookie-god-script.js?raw";
import kahootScript from "@/imports/pasted_text/kahoot-cheat-mod-user.js?raw";
import kahootGuiScript from "@/imports/pasted_text/kahoot-solver-user.js?raw";
import geoguessrScript from "@/imports/pasted_text/geoguessr-cheat-universal-user.js?raw";
import ttrsScript from "@/imports/pasted_text/ttrs-instant-answer-user.js?raw";
import quizletScript from "@/imports/pasted_text/quizlet-cheat-user.js?raw";

const EP_AUTO_ANSWER_SCRIPT = `// ==UserScript==
// @name         ep-bot
// @namespace    http://tampermonkey.net/
// @version      4.0.1
// @description  copy answer to clipboard
// @author      SyncX
// @match        https://app.educationperfect.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

/*
MIT License

Copyright (c) 2025 EP-bot

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function () {
    'use strict';
    let dictionary = {};
    function replaceSemicolons(text) { return text.replace(/;/g, ','); }
    function extractTextPairs() {
        const newDict = {};
        const pairs = document.querySelectorAll('.targetLanguage.question-label');
        pairs.forEach(pair => {
            const base = pair.parentElement.querySelector('.baseLanguage.question-label');
            if (base) {
                let q = replaceSemicolons(pair.textContent.trim());
                let a = replaceSemicolons(base.textContent.trim());
                if (q && a) { newDict[q] = a; newDict[a] = q; }
            }
        });
        const same = Object.keys(newDict).length === Object.keys(dictionary).length && Object.keys(newDict).every(k => dictionary[k] === newDict[k]);
        if (!same && Object.keys(newDict).length > 0) { dictionary = newDict; }
    }
    function getStartsWithHint() {
        const hintElement = document.querySelector('span[ng-if="hint"]');
        if (hintElement && hintElement.textContent.includes("starts with")) {
            const match = hintElement.textContent.match(/starts with '(\\w)'/);
            return match ? match[1] : null;
        }
        return null;
    }
    function filterAnswer(answer, startsWith) {
        if (!startsWith) return answer;
        const options = answer.split(', ').filter(word => word.toLowerCase().startsWith(startsWith.toLowerCase()));
        return options.length > 0 ? options[0] : answer;
    }
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            const node = mutation.target;
            if (node && node.nodeType === Node.ELEMENT_NODE && node.id === 'question-text') {
                const originalText = node.textContent.trim();
                if (dictionary[originalText]) {
                    const answer = dictionary[originalText];
                    const startsWith = getStartsWithHint();
                    const finalAnswer = filterAnswer(answer, startsWith);
                    navigator.clipboard.writeText(finalAnswer);
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(extractTextPairs, 200);
})();`;
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import syncAvatar from "@/imports/image.png";
import xenoAvatar from "@/imports/98b1277753f984317610b1568f49f7f4.jpg";

type Page = "home" | "scripts" | "contributors" | "howto";

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
        <Code2 size={18} className="text-black" />
      </div>
      <span className="font-bold text-xl tracking-tight text-white">
        Sync<span className="text-white/50">X</span>
      </span>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const links: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home size={15} /> },
    { id: "scripts", label: "Scripts", icon: <ScrollText size={15} /> },
    { id: "howto", label: "How To Use", icon: <BookOpen size={15} /> },
    { id: "contributors", label: "Contributors", icon: <Users size={15} /> },
  ];

  return (
    <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4">
      <nav className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-white/10 bg-[#111111]/90 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <div className="pr-5 mr-1">
          <Logo />
        </div>
        <div className="w-px h-6 bg-white/10 mr-1" />
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => setPage(link.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              page === link.id
                ? "bg-white text-black"
                : "text-white/50 hover:text-white hover:bg-white/8"
            }`}
          >
            {link.icon}
            {link.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Hero ── */}
      <section className="relative flex flex-col justify-start min-h-screen px-6 pt-40 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />

        <div className="max-w-5xl mx-auto w-full">
          <h1 className="text-7xl md:text-[10rem] font-black text-white leading-[0.88] tracking-tighter mb-8 max-w-4xl">
            Use Raw<br />
            <span className="text-white/20">Power.</span>
          </h1>

          <p className="text-lg text-white/40 max-w-sm leading-relaxed mb-12">
            Scripts that do things they probably shouldn't. Copy. Paste. Done.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setPage("scripts")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
            >
              Get Scripts
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => setPage("howto")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/12 text-white/50 font-semibold text-sm hover:text-white hover:border-white/25 transition-all"
            >
              How To Use
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/15">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/15" />
          <span className="text-[10px] uppercase tracking-widest font-medium">Scroll</span>
        </div>
      </section>

      {/* ── What is this ── */}
      <section className="py-28 px-6 border-t border-white/6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/25 font-medium mb-5">What is SyncX</p>
            <h2 className="text-4xl font-black text-white leading-tight tracking-tight mb-6">
              Scripts that bend the rules — legally, in your own browser.
            </h2>
            <p className="text-white/40 leading-relaxed">
              SyncX is a collection of browser scripts for games, quiz platforms, and more. No installs, no accounts. Open your console, paste, run.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: "Education Perfect", tag: "Auto-answer" },
              { label: "Kahoot", tag: "Solver" },
              { label: "Blooket", tag: "GUI Mod" },
              { label: "GeoGuessr", tag: "Location cheat" },
              { label: "Games", tag: "Aimbot & ESP" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setPage("scripts")}
                className="flex items-center justify-between px-5 py-4 rounded-xl border border-white/8 bg-[#111] hover:bg-[#161616] hover:border-white/18 transition-all group text-left"
              >
                <span className="text-white/70 font-medium group-hover:text-white transition-colors">{item.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-white/25 font-medium group-hover:text-white/50 transition-colors">{item.tag}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 border-t border-white/6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Pick your script.<br />
            <span className="text-white/25">Redefine the possible.</span>
          </h2>
          <button
            onClick={() => setPage("scripts")}
            className="shrink-0 flex items-center gap-2 px-7 py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors"
          >
            Browse Scripts <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <footer className="border-t border-white/6 py-8 px-6 text-center text-xs text-white/20">
        SyncX Scripts — Use Raw Power
      </footer>
    </div>
  );
}

// ── Scripts Page ──────────────────────────────────────────────────────────────
type Script = {
  id: number;
  name: string;
  category: string;
  desc: string;
  site: string;
  githubUrl: string;
  rawUrl: string;
  localContent?: string;
};

type Section = {
  id: string;
  label: string;
  scripts: Script[];
};

const SECTIONS: Section[] = [
  {
    id: "education-perfect",
    label: "Education Perfect",
    scripts: [
      {
        id: 10,
        name: "Educated to Perfection GUI",
        category: "Education Perfect",
        desc: "A full-featured Tampermonkey userscript GUI for Education Perfect. Captures word lists, auto-suggests answers, supports multiple language profiles, themes, hotkeys, and more. Install via Tampermonkey, then visit app.educationperfect.com and open the panel with Shift+M.",
        site: "app.educationperfect.com",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: epScript,
      },
      {
        id: 11,
        name: "EP Auto Answer",
        category: "Education Perfect",
        desc: "Lightweight Tampermonkey script that watches the question text and automatically copies the correct answer to your clipboard. No GUI needed — just install, load a lesson to capture the word list, then paste your answers.",
        site: "app.educationperfect.com",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: EP_AUTO_ANSWER_SCRIPT,
      },
    ],
  },
  {
    id: "kahoot",
    label: "Kahoot",
    scripts: [
      {
        id: 30,
        name: "Kahoot Menu (OUTDATED)",
        category: "Kahoot",
        desc: "A Tampermonkey cheat menu for Kahoot. Note: may not work on the latest version of Kahoot. Install via Tampermonkey, then join a Kahoot game to activate.",
        site: "kahoot.it",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: kahootScript,
      },
      {
        id: 31,
        name: "Kahoot GUI",
        category: "Kahoot",
        desc: "A full GUI solver for Kahoot. Install via Tampermonkey, then join a Kahoot game and the panel will appear automatically.",
        site: "kahoot.it",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: kahootGuiScript,
      },
    ],
  },
  {
    id: "blooket",
    label: "Blooket",
    scripts: [
      {
        id: 1,
        name: "Zobro Blooket GUI",
        category: "Blooket",
        desc: "A full GUI mod for Blooket. Open Inspect Element on blooket.com, go to the Console tab, paste the entire script, and press Enter.",
        site: "blooket.com",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: blooketScript,
      },
      {
        id: 2,
        name: "Blooket GUI SYNC VERSION",
        category: "Blooket",
        desc: "SyncX's own Blooket GUI build. Open Inspect Element on blooket.com, go to the Console tab, paste the entire script, and press Enter.",
        site: "blooket.com",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: blooketSyncScript,
      },
    ],
  },
  {
    id: "games",
    label: "Games",
    scripts: [
      {
        id: 20,
        name: "1v1.LOL Aimbot & ESP",
        category: "Games",
        desc: "Aimbot and ESP script for 1v1.lol. Open Inspect Element on 1v1.lol, go to the Console tab, paste the entire script, and press Enter.",
        site: "1v1.lol",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: aimScript,
      },
      {
        id: 21,
        name: "BuildNow GG GUI",
        category: "Games",
        desc: "GUI mod script for BuildNow.gg. Open Inspect Element on buildnow.gg, go to the Console tab, paste the entire script, and press Enter.",
        site: "buildnow.gg",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: buildnowScript,
      },
      {
        id: 22,
        name: "Cookie Clicker GUI",
        category: "Games",
        desc: "GUI mod for Cookie Clicker. Open Inspect Element on orteil.dashnet.org/cookieclicker, go to the Console tab, paste the entire script, and press Enter.",
        site: "orteil.dashnet.org",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: cookieScript,
      },
      {
        id: 23,
        name: "GeoGuessr Cheat",
        category: "Games",
        desc: "Universal cheat script for GeoGuessr. Install via Tampermonkey, then open any GeoGuessr game and the answer will be revealed automatically.",
        site: "geoguessr.com",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: geoguessrScript,
      },
    ],
  },
  {
    id: "ttrs",
    label: "TimesTable RockStars (TTRS)",
    scripts: [
      {
        id: 40,
        name: "TTRS Bot",
        category: "TimesTable RockStars (TTRS)",
        desc: "Instant answer bot for TimesTable RockStars. Install via Tampermonkey, then open any TTRS game and answers will be submitted automatically.",
        site: "ttrockstars.com",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: ttrsScript,
      },
    ],
  },
  {
    id: "quizlet",
    label: "Quizlet",
    scripts: [
      {
        id: 50,
        name: "Quizlet Cheat",
        category: "Quizlet",
        desc: "Cheat script for Quizlet. Install via Tampermonkey, then open any Quizlet study set or game and answers will be revealed automatically.",
        site: "quizlet.com",
        githubUrl: "https://github.com/nij0004-code/Web-Hacks",
        rawUrl: "",
        localContent: quizletScript,
      },
    ],
  },
];

function HowToUse() {
  const steps = [
    { n: "1", text: "Open the target website in your browser." },
    { n: "2", text: 'Right-click the page and choose "Inspect", then click the Console tab.' },
    { n: "3", text: "Copy the script below and paste the entire thing into the console, then hit Enter." },
  ];
  return (
    <div className="mb-10 p-6 rounded-xl border border-white/8 bg-[#111]">
      <p className="text-xs uppercase tracking-widest text-white/30 font-medium mb-5">How to use</p>
      <div className="flex flex-col sm:flex-row gap-6">
        {steps.map((s) => (
          <div key={s.n} className="flex items-start gap-3 flex-1">
            <span className="shrink-0 w-6 h-6 rounded-full border border-white/15 flex items-center justify-center text-xs text-white/40 font-mono mt-0.5">{s.n}</span>
            <p className="text-sm text-white/45 leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptCard({ script }: { script: Script }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  function fallbackCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  async function writeToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      fallbackCopy(text);
    }
  }

  async function copyScript() {
    if (script.localContent) {
      await writeToClipboard(script.localContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(script.rawUrl);
      const text = await res.text();
      await writeToClipboard(text);
      setCopied(true);
    } catch {
      await writeToClipboard(`// Visit: ${script.githubUrl}`);
      setCopied(true);
    }
    setLoading(false);
    setTimeout(() => setCopied(false), 2500);
  }

  const isLocal = Boolean(script.localContent);

  return (
    <div className="p-6 rounded-xl border border-white/8 bg-[#111] hover:border-white/18 transition-all">
      <div className="flex items-start gap-3 mb-4">
        <div>
          <h3 className="text-white font-semibold text-base mb-1">{script.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-white/35 font-medium">{script.category}</span>
            <span className="text-white/15">·</span>
            <span className="text-[10px] font-mono text-white/30">{script.site}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-white/40 leading-relaxed mb-5">{script.desc}</p>

      {isLocal && (() => {
        const content = script.localContent!;
        const headerLines = content
          .split("\n")
          .filter(l => l.startsWith("// @name") || l.startsWith("// @author") || l.startsWith("// @match") || l.startsWith("// @version"))
          .slice(0, 4);
        const lineCount = content.split("\n").length;
        const fileName = content.includes("ep-bot") ? "ep-bot.user.js" : "education-perfect-hack.user.js";
        return (
          <div className="mb-5 rounded-lg border border-white/8 bg-[#0d0d0d] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/6 bg-[#0a0a0a]">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-white/12" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/12" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/12" />
              </div>
              <span className="text-[10px] text-white/25 font-mono ml-1">{fileName}</span>
            </div>
            <div className="px-4 py-3 font-mono text-xs text-white/30 space-y-0.5 select-none">
              {headerLines.map((line, i) => {
                const [key, ...rest] = line.replace("// ", "").split(/\s{2,}/);
                return (
                  <div key={i}>
                    <span className="text-white/18">{`// ${key}`}</span>
                    {"  " + rest.join("  ")}
                  </div>
                );
              })}
              <div className="pt-1 text-white/15 italic">{`// ···  ${lineCount.toLocaleString()} lines  ···`}</div>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center gap-2">
        <button
          onClick={copyScript}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : loading ? "Fetching…" : "Copy Script"}
        </button>
        <a
          href={script.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:text-white hover:border-white/25 transition-all"
        >
          <ExternalLink size={12} />
          View on GitHub
        </a>
      </div>
    </div>
  );
}

function ScriptsPage() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const section = SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-32 pb-24 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Script Library</h1>
          <p className="text-white/40">
            All scripts sourced from{" "}
            <a
              href="https://github.com/nij0004-code/Web-Hacks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white underline underline-offset-2 transition-colors"
            >
              github.com/nij0004-code/Web-Hacks
            </a>
            . Paste into your browser console via Inspect Element.
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="shrink-0 w-48">
            <p className="text-[10px] uppercase tracking-widest text-white/25 font-medium mb-3 px-2">Categories</p>
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                    activeSection === s.id
                      ? "bg-white text-black"
                      : "text-white/45 hover:text-white hover:bg-white/6"
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`text-[10px] font-mono ${activeSection === s.id ? "text-black/50" : "text-white/20"}`}>
                    {s.scripts.length}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">{section.label}</h2>
              <p className="text-sm text-white/35 mt-0.5">
                {section.scripts.length} script{section.scripts.length !== 1 ? "s" : ""}
              </p>
            </div>

            <HowToUse />

            {section.scripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-white/6 border-dashed">
                <Code2 size={28} className="text-white/15 mb-3" />
                <p className="text-sm text-white/25">No scripts yet — check back soon.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {section.scripts.map((s) => <ScriptCard key={s.id} script={s} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── How To Use Page ───────────────────────────────────────────────────────────
function HowToUsePage() {
  const [copiedMethod, setCopiedMethod] = useState<string | null>(null);

  function fallbackCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  async function copySnippet(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); } catch { fallbackCopy(text); }
    setCopiedMethod(key);
    setTimeout(() => setCopiedMethod(null), 2500);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-32 pb-24 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-white/50 text-xs font-medium mb-6">
            <BookOpen size={11} />
            Installation Guide
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">How To Use</h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg">
            Every script on SyncX can be run two ways. The <span className="text-white/70 font-semibold">Tampermonkey method is preferred</span> — it's persistent, automatic, and doesn't require you to paste anything each session.
          </p>
        </div>

        {/* Method 1 — Tampermonkey (preferred) */}
        <div className="relative mb-6 p-6 rounded-2xl border border-white/12 bg-[#111] overflow-hidden">
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-widest">
            Preferred
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/60">
              <Chrome size={17} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none mb-1">Method 1 — Tampermonkey</h2>
              <p className="text-white/35 text-xs">Install once, runs automatically every visit</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                n: "1",
                title: "Install Tampermonkey",
                body: "Add the Tampermonkey extension to your browser. It's available for Chrome, Firefox, Edge, and Safari.",
                link: { label: "Get Tampermonkey →", href: "https://www.tampermonkey.net/" },
              },
              {
                n: "2",
                title: "Create a new script",
                body: 'Click the Tampermonkey icon in your toolbar, then choose "Create a new script". A code editor will open with a blank template.',
              },
              {
                n: "3",
                title: "Paste the script",
                body: "Select all the placeholder text in the editor (Ctrl+A / Cmd+A), delete it, then paste the script you copied from SyncX.",
              },
              {
                n: "4",
                title: "Save and go",
                body: 'Hit Ctrl+S (or Cmd+S) to save. Navigate to the target site — the script will run automatically. No more pasting needed.',
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full border border-white/12 flex items-center justify-center text-xs text-white/40 font-mono mt-0.5">
                  {step.n}
                </span>
                <div> 
                  <p className="text-white font-semibold text-sm mb-1">{step.title}</p>
                  <p className="text-white/40 text-sm leading-relaxed">{step.body}</p>
                  {step.link && (
                    <a
                      href={step.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-white/50 hover:text-white transition-colors"
                    >
                      <ExternalLink size={11} />
                      {step.link.label}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Method 2 — Console paste */}
        <div className="relative mb-8 p-6 rounded-2xl border border-white/8 bg-[#111]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/60">
              <Terminal size={17} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none mb-1">Method 2 — Browser Console</h2>
              <p className="text-white/35 text-xs">Quick and temporary — must re-paste each session</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                n: "1",
                title: "Go to the target site",
                body: "Open the website the script is meant for (e.g. blooket.com, kahoot.it, educationperfect.com).",
              },
              {
                n: "2",
                title: "Open Inspect Element",
                body: 'Right-click anywhere on the page and choose "Inspect" — or press F12 on Windows / Cmd+Option+I on Mac.',
              },
              {
                n: "3",
                title: 'Click the "Console" tab',
                body: "In the developer tools panel that opens, click the Console tab along the top.",
              },
              {
                n: "4",
                title: "Paste and run",
                body: 'Click inside the console input at the bottom, paste the script (Ctrl+V / Cmd+V), then press Enter. The script will run immediately.',
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full border border-white/12 flex items-center justify-center text-xs text-white/40 font-mono mt-0.5">
                  {step.n}
                </span>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{step.title}</p>
                  <p className="text-white/40 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Console snippet */}
          <div className="mt-6 rounded-xl border border-white/8 bg-[#0d0d0d] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6 bg-[#0a0a0a]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/12" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/12" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/12" />
                </div>
                <span className="text-[10px] text-white/25 font-mono ml-1">Console</span>
              </div>
              <button
                onClick={() => copySnippet("// 1. Paste your copied script here\n// 2. Press Enter", "console")}
                className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white transition-colors"
              >
                {copiedMethod === "console" ? <Check size={10} /> : <Copy size={10} />}
                {copiedMethod === "console" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="px-4 py-3 font-mono text-xs space-y-1 select-none">
              <div className="text-white/20">{">"} <span className="text-white/40">{"// Paste script here, then hit Enter"}</span></div>
              <div className="text-white/15 animate-pulse">{"█"}</div>
            </div>
          </div>
        </div>

        {/* Warning note */}
        <div className="flex gap-3 p-4 rounded-xl border border-white/8 bg-[#0d0d0d]">
          <AlertTriangle size={15} className="text-white/30 shrink-0 mt-0.5" />
          <p className="text-xs text-white/35 leading-relaxed">
            Scripts run in your browser only and are never sent to any server. Always copy scripts from SyncX directly — never paste scripts from unknown sources into your console or Tampermonkey.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Contributors Page ─────────────────────────────────────────────────────────
function ContributorsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-32 pb-24 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Contributors</h1>
          <p className="text-white/40">The people who build and maintain SyncX — open source, community driven.</p>
        </div>

        {/* Contributor cards */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          <div className="w-72 p-8 rounded-2xl border border-white/10 bg-[#111] flex flex-col items-center text-center hover:border-white/20 transition-all">
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-[#1a1a1a] mb-5 border border-white/10">
              <ImageWithFallback
                src={syncAvatar}
                alt="Sync — SyncX founder and core maintainer"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-white font-bold text-xl mb-1">Sync</div>
            <div className="text-xs text-white/35 uppercase tracking-widest mb-6">Founder & Core Maintainer</div>
            <a
              href="https://github.com/nij0004-code"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/12 text-sm text-white/50 hover:text-white hover:border-white/30 transition-all"
            >
              <ExternalLink size={12} />
              @nij0004-code
            </a>
          </div>

          <div className="w-72 p-8 rounded-2xl border border-white/10 bg-[#111] flex flex-col items-center text-center hover:border-white/20 transition-all">
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-[#0d0d0d] mb-5 border border-white/10">
              <ImageWithFallback
                src={xenoAvatar}
                alt="Mr Xeno — Web Designer and Web Builder"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-white font-bold text-xl mb-1">Mr Xeno</div>
            <div className="text-xs text-white/35 uppercase tracking-widest mb-6">Web Designer & Web Builder</div>
            <div className="flex flex-col gap-2 w-full">
              <a
                href="https://github.com/DeveloperXXeno"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/12 text-sm text-white/50 hover:text-white hover:border-white/30 transition-all"
              >
                <ExternalLink size={12} />
                @DeveloperXXeno
              </a>
              <a
                href="https://developerxeno.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/12 text-sm text-white/50 hover:text-white hover:border-white/30 transition-all"
              >
                <Globe size={12} />
                developerxeno.netlify.app
              </a>
            </div>
          </div>
        </div>

        {/* Submit banner */}
        <div className="p-6 rounded-xl border border-white/10 bg-[#111] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-white font-semibold mb-1">Want to contribute a script?</div>
            <div className="text-sm text-white/40">Submit a pull request on GitHub. All website scripts welcome — must be vanilla JS and under 10kb minified.</div>
          </div>
          <a
            href="https://github.com/nij0004-code"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            <ExternalLink size={13} />
            Open a PR
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");

  function navigate(p: Page) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar page={page} setPage={navigate} />
      {page === "home" && <HomePage setPage={navigate} />}
      {page === "scripts" && <ScriptsPage />}
      {page === "howto" && <HowToUsePage />}
      {page === "contributors" && <ContributorsPage />}
    </div>
  );
}
