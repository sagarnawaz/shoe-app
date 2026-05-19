"use client";

import Image from "next/image";

export default function SplashScreen() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#f5f8fb] px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-[-18px] rounded-[2rem] bg-primary/10 blur-2xl app-splash-glow" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/70 bg-white shadow-2xl shadow-slate-900/10 app-splash-float">
            <Image src="/favicon.svg" alt="" width={92} height={92} priority className="rounded-[1.35rem]" />
          </div>
        </div>

        <h1 className="mt-7 text-2xl font-black leading-tight text-slate-950" dir="rtl">
          امین شوز ہاؤس
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Stock Management</p>

        <div className="mt-8 h-1.5 w-44 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 rounded-full bg-primary app-splash-progress" />
        </div>
      </div>
    </main>
  );
}
