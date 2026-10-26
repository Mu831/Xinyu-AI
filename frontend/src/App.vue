<script setup>
// 第一阶段只搭空页面，不在这里放 ECharts 或 Agent 业务逻辑。
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden bg-[#eee9ff] text-[#263044]"
  >
    <!-- 页面背景的柔和光斑 -->
    <div
      class="pointer-events-none absolute -left-28 -top-24 h-96 w-96 rounded-full bg-[#f7b9d2]/55 blur-3xl"
    ></div>
    <div
      class="pointer-events-none absolute -right-24 top-1/4 h-[26rem] w-[26rem] rounded-full bg-[#9ed9e8]/50 blur-3xl"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-[#c8b8ff]/45 blur-3xl"
    ></div>

    <main
      class="relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-8"
    >
      <!-- 桌面小组件式毛玻璃主面板 -->
      <section
        class="flex min-h-[calc(100vh-2rem)] w-full max-w-[1440px] flex-col overflow-hidden rounded-[2rem] border border-white/75 bg-white/35 shadow-[0_28px_90px_rgba(66,54,105,0.22)] backdrop-blur-2xl sm:min-h-[calc(100vh-3rem)] lg:max-h-[920px] lg:min-h-[680px] lg:flex-row"
      >
        <!-- 左栏：预留给 ECharts 情绪雷达图 -->
        <div class="flex min-w-0 flex-1 flex-col p-5 sm:p-7 lg:p-9">
          <header class="flex items-start justify-between gap-4">
            <div>
              <p
                class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-500"
              >
                <span class="h-2 w-2 rounded-full bg-violet-400"></span>
                AI EMOTION COMPANION
              </p>
              <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
                心屿
                <span class="font-medium text-slate-500">· 今天感觉如何？</span>
              </h1>
            </div>

            <!-- 小组件顶部装饰按钮，当前仅用于布局占位 -->
            <div
              class="mt-1 hidden items-center gap-1.5 rounded-full border border-white/80 bg-white/40 px-3 py-2 backdrop-blur sm:flex"
              aria-hidden="true"
            >
              <span class="h-2 w-2 rounded-full bg-[#f2a9be]"></span>
              <span class="h-2 w-2 rounded-full bg-[#f4d58a]"></span>
              <span class="h-2 w-2 rounded-full bg-[#96d5c4]"></span>
            </div>
          </header>

          <!-- 这里就是之后挂载 ECharts 的区域 -->
          <div
            class="relative mt-6 flex min-h-[310px] flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-dashed border-violet-300/80 bg-white/25 sm:mt-8"
          >
            <div
              class="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle,_rgba(124,96,190,0.18)_1px,_transparent_1px)] [background-size:22px_22px]"
            ></div>

            <!-- 第二阶段把 ECharts 实例挂到这个无内容容器中 -->
            <div
              id="emotion-radar"
              class="absolute inset-0"
              aria-label="情绪雷达图区域"
            ></div>

            <div
              class="pointer-events-none relative flex flex-col items-center rounded-2xl border border-white/80 bg-white/35 px-7 py-5 text-center backdrop-blur-sm"
            >
              <div
                class="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/80 text-xl text-violet-500"
                aria-hidden="true"
              >
                ◌
              </div>
              <p class="font-medium text-slate-600">ECharts 情绪雷达图</p>
              <p class="mt-1 text-xs text-slate-400">图表区域已预留</p>
            </div>
          </div>
        </div>

        <!-- 右栏：日记输入与宠物对话占位 -->
        <aside
          class="flex w-full flex-col border-t border-white/65 bg-white/25 p-5 backdrop-blur-xl sm:p-7 lg:w-[42%] lg:min-w-[390px] lg:border-l lg:border-t-0 lg:p-8"
        >
          <div class="mb-4 flex items-end justify-between gap-4">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400"
              >
                DAILY NOTE
              </p>
              <h2 class="mt-1 text-lg font-bold text-slate-700">情绪日记</h2>
            </div>
            <span class="text-xs text-slate-400">此刻的你</span>
          </div>

          <label class="sr-only" for="diary-input">输入今天的情绪日记</label>
          <textarea
            id="diary-input"
            class="min-h-36 w-full rounded-2xl border border-white/80 bg-white/45 px-4 py-4 text-sm leading-7 text-slate-700 shadow-inner shadow-violet-900/5 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white/65 focus:ring-4 focus:ring-violet-200/50"
            placeholder="写下此刻的心情、发生的事，或任何想说出口的话……"
          ></textarea>

          <div class="my-6 flex items-center gap-3 text-[11px] text-slate-400">
            <span class="h-px flex-1 bg-white/90"></span>
            <span>两位伙伴正在陪伴你</span>
            <span class="h-px flex-1 bg-white/90"></span>
          </div>

          <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
            <!-- 感性 Agent 气泡占位 -->
            <article class="flex items-start gap-3">
              <div
                class="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border-2 border-white/90 bg-gradient-to-br from-rose-200 to-pink-300 text-sm font-bold text-rose-600 shadow-md shadow-rose-300/30"
              >
                <span>感</span>
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix"
                  alt="感性宠物头像"
                  class="absolute inset-0 h-full w-full object-cover"
                  @error="$event.currentTarget.style.display = 'none'"
                />
              </div>

              <div class="min-w-0">
                <div class="mb-1.5 flex items-center gap-2">
                  <span class="text-xs font-semibold text-rose-500">感性伙伴</span>
                  <span class="text-[10px] text-slate-400">FEEL</span>
                </div>
                <div
                  class="rounded-[0.35rem_1.15rem_1.15rem_1.15rem] border border-white/85 bg-white/60 px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm backdrop-blur"
                >
                  我在这里，愿意先听你慢慢说。
                </div>
              </div>
            </article>

            <!-- 理性 Agent 气泡占位 -->
            <article class="flex flex-row-reverse items-start gap-3">
              <div
                class="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border-2 border-white/90 bg-gradient-to-br from-sky-200 to-cyan-300 text-sm font-bold text-sky-700 shadow-md shadow-sky-300/30"
              >
                <span>理</span>
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=Aneka"
                  alt="理性宠物头像"
                  class="absolute inset-0 h-full w-full object-cover"
                  @error="$event.currentTarget.style.display = 'none'"
                />
              </div>

              <div class="flex min-w-0 flex-col items-end">
                <div class="mb-1.5 flex items-center gap-2">
                  <span class="text-[10px] text-slate-400">LOGIC</span>
                  <span class="text-xs font-semibold text-sky-600">理性伙伴</span>
                </div>
                <div
                  class="rounded-[1.15rem_0.35rem_1.15rem_1.15rem] border border-white/85 bg-sky-50/55 px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm backdrop-blur"
                >
                  等你说完，我们再一起理清发生了什么。
                </div>
              </div>
            </article>
          </div>

          <!-- 按钮只占位，本阶段不绑定任何事件 -->
          <button
            type="button"
            class="mt-6 w-full cursor-default rounded-2xl bg-gradient-to-r from-violet-500/90 to-rose-400/90 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
          >
            开始陪伴
          </button>
        </aside>
      </section>
    </main>
  </div>
</template>
