const themeMap = {
  purple: 'from-[#6E63D8] via-[#8C85E8] to-[#C8C0FF]',
  teal: 'from-[#0F8E75] via-[#3AB79C] to-[#B1F0DF]',
  coral: 'from-[#D95A4C] via-[#FF8F79] to-[#FFD1C7]',
  amber: 'from-[#D08A1E] via-[#F2B84B] to-[#FFE0A8]',
};

export default function VisionBoard({ visionBoard }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${themeMap[visionBoard.color_theme] || themeMap.purple} p-8 text-white shadow-glow`}>
      <div className="glass-orb left-8 top-12 h-24 w-24 bg-white/25 animate-float" />
      <div className="glass-orb bottom-12 right-8 h-32 w-32 bg-black/10 animate-float" />
      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/75">Vision board</p>
          <h2 className="mt-4 max-w-lg text-4xl font-medium leading-tight md:text-5xl">{visionBoard.hero_phrase}</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {visionBoard.visual_keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur">
                {keyword}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/20 bg-white/10 p-6 backdrop-blur">
          <p className="text-sm font-medium text-white/75">Milestones to celebrate</p>
          <div className="mt-5 space-y-4">
            {visionBoard.milestones_to_celebrate.map((item, index) => (
              <div key={item} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-sm font-medium">
                  0{index + 1}
                </div>
                <p className="text-base font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
