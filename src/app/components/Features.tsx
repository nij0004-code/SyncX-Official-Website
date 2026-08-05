import { Shield, Zap, Code2, Users, MessageSquare, Settings } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Advanced Moderation",
    description: "Keep your server safe with automated moderation tools and customizable filters.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience instant command execution with optimized performance and reliability.",
  },
  {
    icon: Code2,
    title: "Custom Commands",
    description: "Create and manage custom commands tailored to your server's unique needs.",
  },
  {
    icon: Users,
    title: "Member Management",
    description: "Efficiently manage your community with advanced member tracking and role automation.",
  },
  {
    icon: MessageSquare,
    title: "Auto Responses",
    description: "Set up automated responses and welcome messages for a better user experience.",
  },
  {
    icon: Settings,
    title: "Easy Configuration",
    description: "Simple and intuitive setup process with comprehensive configuration options.",
  },
];

export function Features() {
  return (
    <section className="relative py-20 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Powerful Features
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Everything you need to manage and enhance your Discord server in one place
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
              >
                <div className="mb-4 w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-300">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
