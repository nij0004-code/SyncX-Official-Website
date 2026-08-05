import { Bot, ExternalLink } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-black opacity-80"></div>
      
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Bot Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
            <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 p-8 rounded-3xl border border-white/10">
              <Bot className="w-20 h-20 text-white" />
            </div>
          </div>
        </div>

        {/* Main heading */}
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
          Scripts Twin
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-3xl mx-auto leading-relaxed">
          Enhance your Discord server with powerful automation, moderation, and custom commands. 
          Add Scripts Twin to your server today and experience the difference.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-black hover:bg-zinc-200 text-lg px-8 py-6 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
          >
            <a
              href="https://discord.com/oauth2/authorize?client_id=1461151623744065618"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <Bot className="w-5 h-5" />
              Add to Discord
            </a>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="bg-transparent border-2 border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
          >
            <a
              href="https://twin--tallbold46.replit.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Visit Website
              <ExternalLink className="w-5 h-5" />
            </a>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-4xl font-bold text-white mb-2">24/7</div>
            <div className="text-zinc-400">Uptime</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-4xl font-bold text-white mb-2">Fast</div>
            <div className="text-zinc-400">Response Time</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-4xl font-bold text-white mb-2">Easy</div>
            <div className="text-zinc-400">Setup</div>
          </div>
        </div>
      </div>
    </section>
  );
}
