<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'

const radarChartRef = ref(null)

let radarChart = null
let resizeObserver = null
let resizeFrame = 0

const emotionData = [
  { name: '焦虑', value: 80, color: '#fb7185' },
  { name: '喜悦', value: 20, color: '#facc15' },
  { name: '孤独', value: 60, color: '#60a5fa' },
  { name: '期待', value: 40, color: '#c084fc' },
  { name: '平静', value: 50, color: '#5eead4' },
]

const dominantEmotion = emotionData.reduce((current, item) =>
  item.value > current.value ? item : current,
)

const createRadarOption = () => ({
  backgroundColor: 'transparent',
  animationDuration: 1400,
  animationDurationUpdate: 900,
  animationEasing: 'cubicOut',
  color: ['#a855f7'],

  aria: {
    enabled: true,
    description: '当前情绪雷达图：焦虑80，喜悦20，孤独60，期待40，平静50。',
  },

  tooltip: {
    trigger: 'item',
    confine: true,
    backgroundColor: 'rgba(34, 27, 58, 0.94)',
    borderColor: 'rgba(216, 180, 254, 0.55)',
    borderWidth: 1,
    padding: 0,
    textStyle: {
      color: '#ffffff',
      fontSize: 12,
    },
    extraCssText:
      'border-radius: 14px; box-shadow: 0 14px 36px rgba(88, 55, 145, 0.32); backdrop-filter: blur(12px);',
    formatter: () => {
      const rows = emotionData
        .map(
          (item) => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:28px;margin-top:9px;">
              <span style="display:flex;align-items:center;gap:8px;color:#e9e1f8;">
                <i style="width:7px;height:7px;border-radius:999px;background:${item.color};box-shadow:0 0 10px ${item.color};"></i>
                ${item.name}
              </span>
              <strong style="color:#ffffff;font-size:13px;">${item.value}</strong>
            </div>
          `,
        )
        .join('')

      return `
        <div style="min-width:168px;padding:14px 16px 16px;">
          <div style="font-size:11px;letter-spacing:0.16em;color:#c4b5fd;">EMOTION RADAR</div>
          <div style="margin-top:4px;font-size:15px;font-weight:700;color:#ffffff;">情绪能量分布</div>
          ${rows}
        </div>
      `
    },
  },

  title: {
    text: `${dominantEmotion.name} ${dominantEmotion.value}`,
    subtext: '当前主导情绪',
    left: 'center',
    top: '45%',
    textAlign: 'center',
    textStyle: {
      color: '#4c3b68',
      fontSize: 18,
      fontWeight: 700,
      textShadowBlur: 12,
      textShadowColor: 'rgba(192, 132, 252, 0.35)',
    },
    subtextStyle: {
      color: 'rgba(100, 82, 127, 0.72)',
      fontSize: 10,
      lineHeight: 22,
      letterSpacing: 2,
    },
  },

  graphic: [
    {
      type: 'circle',
      left: 'center',
      top: 'center',
      z: 0,
      silent: true,
      shape: {
        r: 38,
      },
      style: {
        fill: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
          { offset: 0, color: 'rgba(255, 255, 255, 0.52)' },
          { offset: 0.65, color: 'rgba(216, 180, 254, 0.16)' },
          { offset: 1, color: 'rgba(168, 85, 247, 0)' },
        ]),
        stroke: 'rgba(192, 132, 252, 0.32)',
        lineWidth: 1,
        shadowBlur: 26,
        shadowColor: 'rgba(168, 85, 247, 0.45)',
      },
    },
  ],

  radar: {
    center: ['50%', '51%'],
    radius: '64%',
    splitNumber: 4,
    shape: 'polygon',
    startAngle: 90,
    indicator: emotionData.map((item) => ({
      name: item.name,
      max: 100,
    })),
    axisName: {
      color: '#655181',
      fontSize: 12,
      fontWeight: 600,
      padding: [4, 6],
    },
    axisLine: {
      lineStyle: {
        color: 'rgba(139, 92, 246, 0.22)',
        width: 1,
      },
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(139, 92, 246, 0.18)',
        width: 1,
      },
    },
    splitArea: {
      areaStyle: {
        color: [
          'rgba(255, 255, 255, 0.16)',
          'rgba(196, 181, 253, 0.07)',
        ],
      },
    },
  },

  series: [
    {
      name: '外层光晕',
      type: 'radar',
      z: 1,
      silent: true,
      symbol: 'none',
      data: [{ value: emotionData.map((item) => item.value) }],
      lineStyle: {
        width: 14,
        color: 'rgba(192, 132, 252, 0.13)',
        shadowBlur: 34,
        shadowColor: 'rgba(168, 85, 247, 0.85)',
      },
      areaStyle: {
        color: 'rgba(168, 85, 247, 0.045)',
      },
    },
    {
      name: '中层辉光',
      type: 'radar',
      z: 2,
      silent: true,
      symbol: 'none',
      data: [{ value: emotionData.map((item) => item.value) }],
      lineStyle: {
        width: 6,
        color: 'rgba(244, 114, 182, 0.2)',
        shadowBlur: 24,
        shadowColor: 'rgba(244, 114, 182, 0.8)',
      },
    },
    {
      name: '当前情绪',
      type: 'radar',
      z: 3,
      symbol: 'circle',
      symbolSize: 8,
      data: [{ value: emotionData.map((item) => item.value) }],
      lineStyle: {
        width: 2.5,
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: '#38bdf8' },
          { offset: 0.48, color: '#c084fc' },
          { offset: 1, color: '#fb7185' },
        ]),
        shadowBlur: 18,
        shadowColor: 'rgba(192, 132, 252, 0.92)',
      },
      itemStyle: {
        color: '#ffffff',
        borderColor: '#a855f7',
        borderWidth: 2,
        shadowBlur: 15,
        shadowColor: 'rgba(168, 85, 247, 0.95)',
      },
      areaStyle: {
        color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.8, [
          { offset: 0, color: 'rgba(251, 113, 133, 0.5)' },
          { offset: 0.5, color: 'rgba(168, 85, 247, 0.36)' },
          { offset: 1, color: 'rgba(56, 189, 248, 0.1)' },
        ]),
      },
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: 4,
          shadowBlur: 28,
          shadowColor: 'rgba(216, 180, 254, 1)',
        },
        itemStyle: {
          borderWidth: 3,
          shadowBlur: 24,
        },
      },
    },
  ],
})

const resizeRadar = () => {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    radarChart?.resize()
  })
}

onMounted(async () => {
  await nextTick()

  if (!radarChartRef.value) return

  radarChart = echarts.init(radarChartRef.value, null, {
    renderer: 'canvas',
    devicePixelRatio: window.devicePixelRatio,
  })
  radarChart.setOption(createRadarOption())

  resizeObserver = new ResizeObserver(resizeRadar)
  resizeObserver.observe(radarChartRef.value)
  window.addEventListener('resize', resizeRadar)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', resizeRadar)
  cancelAnimationFrame(resizeFrame)
  radarChart?.dispose()
  radarChart = null
})
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

          <!-- ECharts 情绪雷达图 -->
          <div
            class="relative mt-6 min-h-[360px] flex-1 overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_60px_rgba(124,58,237,0.12)] sm:mt-8"
          >
            <div
              class="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle,_rgba(124,96,190,0.18)_1px,_transparent_1px)] [background-size:22px_22px]"
            ></div>

            <div
              class="radar-scan pointer-events-none absolute left-1/2 top-[51%] aspect-square w-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              aria-hidden="true"
            ></div>

            <div
              class="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/75 bg-white/45 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-violet-600 shadow-sm backdrop-blur-md sm:left-5 sm:top-5"
            >
              <span class="relative flex h-2 w-2">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"
                ></span>
                <span
                  class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"
                ></span>
              </span>
              LIVE EMOTION
            </div>

            <div
              class="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/65 bg-white/35 px-3 py-1.5 text-[10px] text-slate-500 backdrop-blur-md"
            >
              悬停图形查看五项情绪数值
            </div>

            <!-- ECharts 实例会渲染到这个容器中 -->
            <div
              ref="radarChartRef"
              id="emotion-radar"
              class="absolute inset-0 z-10"
              aria-label="情绪雷达图区域"
            ></div>
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

<style scoped>
.radar-scan {
  z-index: 1;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    transparent 250deg,
    rgba(192, 132, 252, 0.04) 300deg,
    rgba(192, 132, 252, 0.24) 352deg,
    rgba(251, 113, 133, 0.42) 360deg
  );
  -webkit-mask-image: radial-gradient(
    circle,
    transparent 0%,
    transparent 18%,
    black 25%,
    black 64%,
    transparent 70%
  );
  mask-image: radial-gradient(
    circle,
    transparent 0%,
    transparent 18%,
    black 25%,
    black 64%,
    transparent 70%
  );
  filter: blur(1px);
  opacity: 0.8;
  mix-blend-mode: screen;
  animation: radar-scan 9s linear infinite;
}

@keyframes radar-scan {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .radar-scan {
    animation: none;
  }
}
</style>
