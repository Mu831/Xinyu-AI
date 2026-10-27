<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from 'vue'
import * as echarts from 'echarts'

const COMPANION_API_URL = '/api/companion'

const radarChartRef = ref(null)
const chatListRef = ref(null)

const diaryText = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const emotionData = reactive([
  { name: '焦虑', value: 80, color: '#fb7185' },
  { name: '喜悦', value: 20, color: '#facc15' },
  { name: '孤独', value: 60, color: '#60a5fa' },
  { name: '期待', value: 40, color: '#c084fc' },
  { name: '平静', value: 50, color: '#5eead4' },
])

const createWelcomeDialogue = () => [
  {
    role: 'feel',
    content: '我在这里，愿意先听你慢慢说。',
  },
  {
    role: 'logic',
    content: '写下此刻发生的事，我们会从不同角度陪你梳理。',
  },
]

const dialogue = ref(createWelcomeDialogue())

let radarChart = null
let resizeObserver = null
let resizeFrame = 0
let activeController = null

const dominantEmotion = computed(() =>
  emotionData.reduce((current, item) =>
    item.value > current.value ? item : current,
  ),
)

const getRadarValues = () => emotionData.map((item) => item.value)

const getAriaDescription = () =>
  `当前情绪雷达图：${emotionData
    .map((item) => `${item.name}${item.value}`)
    .join('，')}。`

const createRadarSeries = () => [
  {
    name: '外层光晕',
    type: 'radar',
    z: 1,
    silent: true,
    symbol: 'none',
    data: [{ value: getRadarValues() }],
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
    data: [{ value: getRadarValues() }],
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
    data: [{ value: getRadarValues() }],
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
]

const createRadarOption = () => ({
  backgroundColor: 'transparent',
  animationDuration: 1400,
  animationDurationUpdate: 900,
  animationEasing: 'cubicOut',
  color: ['#a855f7'],

  aria: {
    enabled: true,
    description: getAriaDescription(),
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
    text: `${dominantEmotion.value.name} ${dominantEmotion.value.value}`,
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

  series: createRadarSeries(),
})

const updateRadarChart = (emotions) => {
  emotionData.forEach((item) => {
    item.value = emotions[item.name]
  })

  radarChart?.setOption({
    aria: {
      description: getAriaDescription(),
    },
    title: {
      text: `${dominantEmotion.value.name} ${dominantEmotion.value.value}`,
    },
    series: createRadarSeries(),
  })
}

const normalizeModelResult = (data) => {
  if (!data?.emotions || typeof data.emotions !== 'object') {
    throw new Error('模型返回的数据缺少 emotions 字段。')
  }

  const emotions = {}

  for (const item of emotionData) {
    const score = Number(data.emotions[item.name])

    if (!Number.isFinite(score)) {
      throw new Error(`模型返回的“${item.name}”评分无效。`)
    }

    emotions[item.name] = Math.round(Math.min(100, Math.max(0, score)))
  }

  if (!Array.isArray(data.dialogue)) {
    throw new Error('模型返回的数据缺少 dialogue 数组。')
  }

  const normalizedDialogue = data.dialogue
    .map((message) => ({
      role: message?.role,
      content:
        typeof message?.content === 'string' ? message.content.trim() : '',
    }))
    .filter(
      (message) =>
        ['feel', 'logic'].includes(message.role) && message.content.length > 0,
    )

  if (normalizedDialogue.length < 4 || normalizedDialogue.length > 6) {
    throw new Error('模型返回的对话数量不符合要求，请重新尝试。')
  }

  const feelCount = normalizedDialogue.filter(
    (message) => message.role === 'feel',
  ).length
  const logicCount = normalizedDialogue.filter(
    (message) => message.role === 'logic',
  ).length

  if (
    feelCount < 2 ||
    feelCount > 3 ||
    logicCount < 2 ||
    logicCount > 3
  ) {
    throw new Error('模型返回的感性与理性对话数量不正确，请重新尝试。')
  }

  return {
    emotions,
    dialogue: normalizedDialogue,
  }
}

const scrollChatToBottom = async () => {
  await nextTick()

  chatListRef.value?.scrollTo({
    top: chatListRef.value.scrollHeight,
    behavior: 'smooth',
  })
}

const startCompanion = async () => {
  if (isLoading.value) return

  const diary = diaryText.value.trim()
  errorMessage.value = ''

  if (!diary) {
    errorMessage.value = '先写下一点此刻的心情，再让伙伴们开始陪伴。'
    return
  }

  isLoading.value = true
  activeController = new AbortController()

  try {
    const response = await fetch(COMPANION_API_URL, {
      method: 'POST',
      signal: activeController.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        diary,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const apiMessage =
        payload?.error?.message ||
        (typeof payload?.error === 'string' ? payload.error : '')

      throw new Error(
        apiMessage || `DeepSeek 请求失败，HTTP 状态码 ${response.status}。`,
      )
    }

    const result = normalizeModelResult(payload)

    updateRadarChart(result.emotions)
    dialogue.value = result.dialogue
    await scrollChatToBottom()
  } catch (error) {
    if (error?.name === 'AbortError') return

    if (error instanceof TypeError) {
      errorMessage.value =
        '无法连接陪伴服务，请确认后端已在 http://localhost:3000 启动。'
    } else {
      errorMessage.value =
        error instanceof Error ? error.message : '请求失败，请稍后重试。'
    }
  } finally {
    isLoading.value = false
    activeController = null
  }
}

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
  activeController?.abort()
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
        <!-- 左栏：ECharts 情绪雷达图 -->
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

            <div
              ref="radarChartRef"
              id="emotion-radar"
              class="absolute inset-0 z-10"
              aria-label="情绪雷达图区域"
            ></div>
          </div>
        </div>

        <!-- 右栏：日记输入与双 Agent 对话 -->
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
            <span class="text-xs text-slate-400">
              {{ diaryText.length }} / 2000
            </span>
          </div>

          <label class="sr-only" for="diary-input">输入今天的情绪日记</label>
          <textarea
            id="diary-input"
            v-model="diaryText"
            maxlength="2000"
            :disabled="isLoading"
            class="min-h-36 w-full rounded-2xl border border-white/80 bg-white/45 px-4 py-4 text-sm leading-7 text-slate-700 shadow-inner shadow-violet-900/5 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white/65 focus:ring-4 focus:ring-violet-200/50 disabled:cursor-not-allowed disabled:opacity-65"
            placeholder="写下此刻的心情、发生的事，或任何想说出口的话……"
            @keydown.ctrl.enter="startCompanion"
          ></textarea>

          <div
            v-if="errorMessage"
            class="mt-3 rounded-xl border border-rose-200/80 bg-rose-50/70 px-3.5 py-2.5 text-xs leading-5 text-rose-600 backdrop-blur"
            role="alert"
          >
            {{ errorMessage }}
          </div>

          <div class="my-5 flex items-center gap-3 text-[11px] text-slate-400">
            <span class="h-px flex-1 bg-white/90"></span>
            <span>{{ isLoading ? '伙伴们正在思考' : '两位伙伴正在陪伴你' }}</span>
            <span class="h-px flex-1 bg-white/90"></span>
          </div>

          <div
            ref="chatListRef"
            class="chat-list flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1"
            aria-live="polite"
          >
            <article
              v-for="(message, index) in dialogue"
              :key="`${message.role}-${index}-${message.content}`"
              class="chat-message flex items-start gap-3"
              :class="message.role === 'logic' ? 'flex-row-reverse' : ''"
              :style="{ animationDelay: `${index * 90}ms` }"
            >
              <div
                class="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border-2 border-white/90 text-sm font-bold shadow-md"
                :class="
                  message.role === 'feel'
                    ? 'bg-gradient-to-br from-rose-200 to-pink-300 text-rose-600 shadow-rose-300/30'
                    : 'bg-gradient-to-br from-sky-200 to-cyan-300 text-sky-700 shadow-sky-300/30'
                "
              >
                <span>{{ message.role === 'feel' ? '感' : '理' }}</span>
                <img
                  :src="
                    message.role === 'feel'
                      ? 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix'
                      : 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka'
                  "
                  :alt="
                    message.role === 'feel' ? '感性宠物头像' : '理性宠物头像'
                  "
                  class="absolute inset-0 h-full w-full object-cover"
                  @error="$event.currentTarget.style.display = 'none'"
                />
              </div>

              <div
                class="flex min-w-0 max-w-[82%] flex-col"
                :class="message.role === 'logic' ? 'items-end' : 'items-start'"
              >
                <div class="mb-1.5 flex items-center gap-2">
                  <span
                    class="text-xs font-semibold"
                    :class="
                      message.role === 'feel' ? 'text-rose-500' : 'text-sky-600'
                    "
                  >
                    {{ message.role === 'feel' ? '感性伙伴' : '理性伙伴' }}
                  </span>
                  <span class="text-[10px] text-slate-400">
                    {{ message.role === 'feel' ? 'FEEL' : 'LOGIC' }}
                  </span>
                </div>

                <div
                  class="border px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm backdrop-blur"
                  :class="
                    message.role === 'feel'
                      ? 'rounded-[0.35rem_1.15rem_1.15rem_1.15rem] border-white/85 bg-white/65'
                      : 'rounded-[1.15rem_0.35rem_1.15rem_1.15rem] border-sky-100/90 bg-sky-50/70'
                  "
                >
                  {{ message.content }}
                </div>
              </div>
            </article>

            <div
              v-if="isLoading"
              class="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/35 px-4 py-3 text-xs text-violet-600 backdrop-blur"
              role="status"
            >
              <span class="flex gap-1" aria-hidden="true">
                <span
                  class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]"
                ></span>
                <span
                  class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]"
                ></span>
                <span
                  class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                ></span>
              </span>
              正在阅读日记并生成情绪回应……
            </div>
          </div>

          <button
            type="button"
            class="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500/90 to-rose-400/90 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
            :disabled="isLoading || !diaryText.trim()"
            :aria-busy="isLoading"
            @click="startCompanion"
          >
            <svg
              v-if="isLoading"
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="3"
              />
              <path
                class="opacity-90"
                fill="currentColor"
                d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z"
              />
            </svg>
            {{ isLoading ? '伙伴们正在思考…' : '开始陪伴' }}
          </button>

          <p class="mt-2.5 text-center text-[10px] text-slate-400">
            Ctrl + Enter 也可以发送
          </p>
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

.chat-message {
  animation: chat-message-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.chat-list {
  scrollbar-color: rgba(139, 92, 246, 0.28) transparent;
  scrollbar-width: thin;
}

@keyframes radar-scan {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes chat-message-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .radar-scan,
  .chat-message {
    animation: none;
  }
}
</style>
