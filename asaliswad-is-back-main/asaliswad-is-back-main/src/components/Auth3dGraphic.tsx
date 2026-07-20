export default function Auth3dGraphic() {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <div style={{ perspective: 1200 }} className="relative w-[360px]">
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-green-500 via-yellow-300 to-white blur-3xl opacity-30" />
        <div className="relative mx-auto h-[450px] w-[320px]">
          <div
            className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white to-slate-100 shadow-[0_40px_120px_rgba(15,23,42,0.18)]"
            style={{ transform: "rotateY(-15deg) rotateX(10deg)" }}
          />

          <div
            className="absolute left-6 top-10 h-24 w-24 rounded-full bg-green-600/90 shadow-[0_30px_50px_rgba(239,68,68,0.25)]"
            style={{ transform: "rotateY(-20deg) translateZ(40px)" }}
          />
          <div
            className="absolute left-10 top-24 h-64 w-56 rounded-[1.75rem] bg-gradient-to-br from-yellow-200 via-white to-green-200 border border-white/70 shadow-[0_30px_70px_rgba(22,163,74,0.15)]"
            style={{ transform: "rotateY(-18deg) rotateX(6deg) translateZ(70px)" }}
          >
            <div className="absolute inset-x-6 top-6 h-14 rounded-3xl bg-white/90 shadow-sm" />
            <div className="absolute inset-x-6 bottom-6 h-14 rounded-3xl bg-white/90 shadow-sm" />
            <div className="absolute left-8 top-20 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full shadow-lg border-2 border-white/80 bg-white">
              <img src="/official-logo.png" alt="Asali Swad" className="h-full w-full object-cover" />
            </div>
            <div className="absolute left-12 bottom-16 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md text-[10px] uppercase tracking-[0.25em] text-slate-500">
              COD
            </div>
          </div>

          <div
            className="absolute left-2 top-16 h-36 w-36 rounded-[1.5rem] bg-slate-950/10 shadow-[0_20px_40px_rgba(15,23,42,0.08)]"
            style={{ transform: "rotateY(-18deg) translateZ(30px)" }}
          />

          <div
            className="absolute -bottom-10 left-1/2 h-12 w-72 -translate-x-1/2 rounded-full bg-slate-950/10 blur-2xl"
            style={{ transform: "translateZ(-40px)" }}
          />
        </div>
      </div>
    </div>
  );
}

