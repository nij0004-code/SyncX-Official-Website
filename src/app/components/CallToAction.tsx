import { Bot, ExternalLink } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function CallToAction() {
  return (
    <section className="relative py-20 px-6 bg-black">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-white/10 p-12 md:p-16 text-center overflow-hidden">
          {/* Background effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              Join thousands of servers already using Scripts Twin. 
              Add it to your server now and unlock powerful features.
            </p>

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
          </div>
        </div>
      </div>
    </section>
  );
}
