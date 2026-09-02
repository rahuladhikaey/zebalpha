export default function Auth3dGraphic() {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <div style={{ perspective: 1200 }} className="relative w-[360px]">
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-zinc-700 via-zinc-900 to-black blur-3xl opacity-40" />
        <div className="relative mx-auto h-[450px] w-[320px]">
          <div
            className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
            style={{ transform: "rotateY(-15deg) rotateX(10deg)" }}
          />

          <div
            className="absolute left-6 top-10 h-24 w-24 rounded-full bg-zinc-800/90 border border-zinc-700 shadow-[0_30px_50px_rgba(0,0,0,0.5)]"
            style={{ transform: "rotateY(-20deg) translateZ(40px)" }}
          />
          <div
            className="absolute left-10 top-24 h-64 w-56 rounded-[2rem] bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-zinc-800 shadow-[0_30px_70px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center p-6"
            style={{ transform: "rotateY(-18deg) rotateX(6deg) translateZ(70px)" }}
          >
            <div className="h-24 w-24 rounded-full overflow-hidden shadow-2xl border-2 border-zinc-700 bg-black flex items-center justify-center p-1">
              <img src="/official-logo.png" alt="ZEBALPHA" className="h-full w-full object-cover rounded-full" />
            </div>
            <span className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-white">ZEBALPHA</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Official Member</span>
          </div>

          <div
            className="absolute left-2 top-16 h-36 w-36 rounded-[1.5rem] bg-zinc-900/30 border border-zinc-800/40 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            style={{ transform: "rotateY(-18deg) translateZ(30px)" }}
          />

          <div
            className="absolute -bottom-10 left-1/2 h-12 w-72 -translate-x-1/2 rounded-full bg-black/60 blur-2xl"
            style={{ transform: "translateZ(-40px)" }}
          />
        </div>
      </div>
    </div>
  );
}

