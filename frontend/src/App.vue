<script setup>
import {
  getHistoryData,
  saveHistoryData,
} from './utils/historyStorage'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from 'vue'
import * as echarts from 'echarts'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(
  /\/$/,
  '',
)
const COMPANION_API_URL = `${API_BASE_URL}/api/companion`

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

const HISTORY_WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const HISTORY_THEMES = {
  焦虑: {
    color: '#e11d48',
    background: 'rgba(244, 63, 94, 0.15)',
    border: 'rgba(225, 29, 72, 0.2)',
    chip: 'bg-rose-50 text-rose-600 border-rose-200',
  },
  喜悦: {
    color: '#d99a00',
    background: 'rgba(250, 204, 21, 0.2)',
    border: 'rgba(217, 154, 0, 0.2)',
    chip: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  孤独: {
    color: '#2563eb',
    background: 'rgba(96, 165, 250, 0.18)',
    border: 'rgba(37, 99, 235, 0.18)',
    chip: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  期待: {
    color: '#9333ea',
    background: 'rgba(192, 132, 252, 0.19)',
    border: 'rgba(147, 51, 234, 0.18)',
    chip: 'bg-purple-50 text-purple-600 border-purple-200',
  },
  平静: {
    color: '#0d9488',
    background: 'rgba(94, 234, 212, 0.2)',
    border: 'rgba(13, 148, 136, 0.18)',
    chip: 'bg-teal-50 text-teal-600 border-teal-200',
  },
}

const isHistoryOpen = ref(false)
const historyRecords = ref([])
const historyError = ref('')
const historyCursor = ref(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
)
const selectedHistoryDate = ref('')
const selectedHistoryRecordId = ref('')

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

const pad2 = (value) => String(value).padStart(2, '0')

const toHistoryDateKey = (date) =>
  [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-')

const todayDateKey = toHistoryDateKey(new Date())

const averageEmotionScores = (records) => {
  return Object.fromEntries(
    emotionData.map(({ name }) => {
      const values = records
        .map((record) => Number(record?.emotionScores?.[name]))
        .filter(Number.isFinite)
      const average = values.length
        ? Math.round(
            values.reduce((sum, value) => sum + value, 0) / values.length,
          )
        : 0

      return [name, average]
    }),
  )
}

const getDominantEmotion = (scores) =>
  emotionData.reduce((current, item) => {
    const score = Number(scores?.[item.name]) || 0

    return score > current.score
      ? { name: item.name, score }
      : current
  }, { name: emotionData[0].name, score: Number(scores?.[emotionData[0].name]) || 0 })

const recordsByDate = computed(() => {
  const result = new Map()

  for (const record of historyRecords.value) {
    if (!record?.dateKey) continue

    if (!result.has(record.dateKey)) {
      result.set(record.dateKey, [])
    }

    result.get(record.dateKey).push(record)
  }

  return result
})

const historyMonthKey = computed(
  () =>
    `${historyCursor.value.getFullYear()}-${pad2(
      historyCursor.value.getMonth() + 1,
    )}`,
)

const historyMonthLabel = computed(
  () =>
    `${historyCursor.value.getFullYear()} 年 ${
      historyCursor.value.getMonth() + 1
    } 月`,
)

const calendarDays = computed(() => {
  const year = historyCursor.value.getFullYear()
  const month = historyCursor.value.getMonth()
  const leadingBlankCount = (new Date(year, month, 1).getDay() + 6) % 7
  const dayCount = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: leadingBlankCount }, () => null)

  for (let day = 1; day <= dayCount; day += 1) {
    const dateKey = `${year}-${pad2(month + 1)}-${pad2(day)}`
    const records = recordsByDate.value.get(dateKey) ?? []
    const emotionScores = records.length
      ? averageEmotionScores(records)
      : null
    const dominantEmotion = emotionScores
      ? getDominantEmotion(emotionScores)
      : null

    days.push({
      day,
      dateKey,
      records,
      emotionScores,
      dominantEmotion,
      theme: dominantEmotion
        ? HISTORY_THEMES[dominantEmotion.name]
        : null,
    })
  }

  while (days.length % 7 !== 0) {
    days.push(null)
  }

  return days
})

const monthlySummary = computed(() => {
  const activeDays = calendarDays.value.filter(
    (day) => day?.records?.length,
  )

  if (!activeDays.length) {
    return {
      activeDays: 0,
      recordCount: 0,
      dominantEmotion: null,
    }
  }

  const emotionScores = averageEmotionScores(
    activeDays.map((day) => ({
      emotionScores: day.emotionScores,
    })),
  )

  return {
    activeDays: activeDays.length,
    recordCount: activeDays.reduce(
      (total, day) => total + day.records.length,
      0,
    ),
    dominantEmotion: getDominantEmotion(emotionScores),
  }
})

const monthlySummaryText = computed(() => {
  if (!monthlySummary.value.activeDays) {
    return '本月还没有记录，写下今天的心情后会在这里点亮。'
  }

  return `本月共记录 ${monthlySummary.value.activeDays} 天，主导情绪为 ${monthlySummary.value.dominantEmotion.name}`
})

const selectedDayRecords = computed(() => {
  if (!selectedHistoryDate.value) return []

  return recordsByDate.value.get(selectedHistoryDate.value) ?? []
})

const selectedHistoryRecord = computed(() => {
  return (
    selectedDayRecords.value.find(
      (record) => record.id === selectedHistoryRecordId.value,
    ) ??
    selectedDayRecords.value[0] ??
    null
  )
})

const selectedHistoryTheme = computed(() => {
  const record = selectedHistoryRecord.value

  if (!record) return null

  return HISTORY_THEMES[getDominantEmotion(record.emotionScores).name]
})

const formatHistoryTime = (createdAt) => {
  const date = new Date(createdAt)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

const formatHistoryDate = (dateKey) => {
  const [year, month, day] = dateKey.split('-')
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`
}

const loadHistoryRecords = () => {
  try {
    historyRecords.value = getHistoryData()
    historyError.value = ''
  } catch (error) {
    historyRecords.value = []
    historyError.value =
      error instanceof Error ? error.message : '往日记录读取失败。'
  }
}

const openHistory = () => {
  loadHistoryRecords()
  historyCursor.value = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
  selectedHistoryDate.value = ''
  selectedHistoryRecordId.value = ''
  isHistoryOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeHistory = () => {
  isHistoryOpen.value = false
  document.body.style.overflow = ''
}

const shiftHistoryMonth = (offset) => {
  historyCursor.value = new Date(
    historyCursor.value.getFullYear(),
    historyCursor.value.getMonth() + offset,
    1,
  )
  selectedHistoryDate.value = ''
  selectedHistoryRecordId.value = ''
}

const selectHistoryRecord = (record) => {
  if (!record) return

  selectedHistoryDate.value = record.dateKey
  selectedHistoryRecordId.value = record.id
  updateRadarChart(record.emotionScores)
}

const selectHistoryDay = (day) => {
  if (!day?.records?.length) return

  selectHistoryRecord(day.records[0])
}

const handleHistoryKeydown = (event) => {
  if (event.key === 'Escape' && isHistoryOpen.value) {
    closeHistory()
  }
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

    try {
      const saved = saveHistoryData({
        diary,
        emotions: result.emotions,
        dialogue: result.dialogue,
      })

      console.log('历史记录已保存：', saved.record.id)

      if (isHistoryOpen.value) {
        loadHistoryRecords()
      }
    } catch (storageError) {
      console.error('历史记录保存失败：', storageError)
    }
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
  window.addEventListener('keydown', handleHistoryKeydown)
})

onBeforeUnmount(() => {
  activeController?.abort()
  resizeObserver?.disconnect()
  window.removeEventListener('resize', resizeRadar)
  window.removeEventListener('keydown', handleHistoryKeydown)
  document.body.style.overflow = ''
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

            <div class="mt-1 flex items-center gap-2">
              <button
                type="button"
                class="group flex items-center gap-2 rounded-full border border-white/85 bg-white/45 px-3.5 py-2 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-violet-200/60"
                aria-haspopup="dialog"
                @click="openHistory"
              >
                <svg
                  class="h-4 w-4 text-violet-500 transition group-hover:scale-110"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 3v3m10-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <path
                    d="m9 15 2 2 4-5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                往日
              </button>

              <div
                class="hidden items-center gap-1.5 rounded-full border border-white/80 bg-white/40 px-3 py-2 backdrop-blur md:flex"
                aria-hidden="true"
              >
                <span class="h-2 w-2 rounded-full bg-[#f2a9be]"></span>
                <span class="h-2 w-2 rounded-full bg-[#f4d58a]"></span>
                <span class="h-2 w-2 rounded-full bg-[#96d5c4]"></span>
              </div>
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

      <Teleport to="body">
        <div
          v-if="isHistoryOpen"
          class="history-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#302a45]/30 p-3 backdrop-blur-md sm:p-6"
          @click.self="closeHistory"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            class="history-modal-panel relative grid max-h-[92vh] w-full max-w-[1180px] overflow-y-auto overscroll-contain rounded-[2rem] border border-white/80 bg-[#f8f5ff]/80 shadow-[0_30px_100px_rgba(48,37,82,0.35)] backdrop-blur-2xl lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:overflow-hidden"
          >
            <div
              class="min-h-0 p-4 sm:p-6 lg:overflow-y-auto lg:p-8"
            >
              <header class="flex items-start justify-between gap-4">
                <div>
                  <p
                    class="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-500"
                  >
                    MEMORY CALENDAR
                  </p>
                  <h2
                    id="history-title"
                    class="mt-1 text-2xl font-bold tracking-tight text-slate-700"
                  >
                    往日情绪日历
                  </h2>
                </div>

                <button
                  type="button"
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/85 bg-white/55 text-lg text-slate-500 shadow-sm backdrop-blur transition hover:bg-white/80 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-violet-200/60 lg:hidden"
                  aria-label="关闭往日日历"
                  @click="closeHistory"
                >
                  ×
                </button>
              </header>

              <div
                class="mt-5 rounded-2xl border border-violet-100/80 bg-white/45 px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm backdrop-blur"
              >
                <span class="mr-2 inline-block h-2 w-2 rounded-full bg-violet-400"></span>
                {{ monthlySummaryText }}
                <span
                  v-if="monthlySummary.recordCount"
                  class="ml-1 text-xs text-slate-400"
                >
                  · 共 {{ monthlySummary.recordCount }} 条记录
                </span>
              </div>

              <div class="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full border border-white/85 bg-white/55 text-slate-500 shadow-sm transition hover:bg-white/85 hover:text-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-200/60"
                  aria-label="上一个月"
                  @click="shiftHistoryMonth(-1)"
                >
                  ‹
                </button>

                <div class="text-center">
                  <p class="text-base font-bold text-slate-700">
                    {{ historyMonthLabel }}
                  </p>
                  <p class="mt-0.5 text-[10px] tracking-[0.15em] text-slate-400">
                    {{ historyMonthKey }}
                  </p>
                </div>

                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full border border-white/85 bg-white/55 text-slate-500 shadow-sm transition hover:bg-white/85 hover:text-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-200/60"
                  aria-label="下一个月"
                  @click="shiftHistoryMonth(1)"
                >
                  ›
                </button>
              </div>

              <div
                v-if="historyError"
                class="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs leading-5 text-rose-600"
                role="alert"
              >
                {{ historyError }}
              </div>

              <div
                class="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold tracking-wider text-slate-400"
              >
                <span
                  v-for="weekday in HISTORY_WEEKDAYS"
                  :key="weekday"
                  class="py-1"
                >
                  {{ weekday }}
                </span>
              </div>

              <div class="mt-1 grid grid-cols-7 gap-1.5">
                <template
                  v-for="(day, index) in calendarDays"
                  :key="day?.dateKey ?? `blank-${index}`"
                >
                  <div
                    v-if="!day"
                    class="min-h-[3.6rem] rounded-xl border border-transparent sm:min-h-[4.5rem]"
                    aria-hidden="true"
                  ></div>

                  <button
                    v-else
                    type="button"
                    class="group relative min-h-[3.6rem] rounded-xl border p-1.5 text-left shadow-sm transition sm:min-h-[4.5rem] sm:p-2"
                    :class="{
                      'cursor-default border-white/60 bg-white/30 text-slate-300 shadow-none': !day.records.length,
                      'cursor-pointer text-slate-700 hover:-translate-y-0.5 hover:shadow-md': day.records.length,
                      'ring-2 ring-violet-400/70 ring-offset-1 ring-offset-[#f8f5ff]': selectedHistoryDate === day.dateKey,
                      'ring-1 ring-inset ring-violet-300/70': todayDateKey === day.dateKey && selectedHistoryDate !== day.dateKey,
                    }"
                    :style="day.theme ? {
                      backgroundColor: day.theme.background,
                      borderColor: day.theme.border,
                    } : undefined"
                    :disabled="!day.records.length"
                    :aria-label="day.records.length
                      ? `${formatHistoryDate(day.dateKey)}，${day.records.length} 条记录，主导情绪${day.dominantEmotion.name}`
                      : `${formatHistoryDate(day.dateKey)}，没有记录`"
                    @click="selectHistoryDay(day)"
                  >
                    <span class="text-xs font-bold sm:text-sm">{{ day.day }}</span>
                    <span
                      v-if="day.records.length"
                      class="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 sm:bottom-2 sm:left-2 sm:right-2"
                    >
                      <span
                        class="h-1.5 w-1.5 rounded-full"
                        :style="{ backgroundColor: day.theme.color }"
                      ></span>
                      <span
                        v-if="day.records.length > 1"
                        class="rounded-full bg-white/65 px-1 text-[9px] font-bold text-slate-500"
                      >
                        {{ day.records.length }}
                      </span>
                    </span>
                  </button>
                </template>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  v-for="(theme, emotionName) in HISTORY_THEMES"
                  :key="emotionName"
                  class="inline-flex items-center gap-1.5 text-[10px] text-slate-500"
                >
                  <i
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: theme.color }"
                  ></i>
                  {{ emotionName }}
                </span>
              </div>
            </div>

            <aside
              class="min-h-0 border-t border-white/75 bg-white/28 p-4 backdrop-blur-xl sm:p-6 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-7"
            >
              <header class="flex items-center justify-between gap-3">
                <div>
                  <p
                    class="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-400"
                  >
                    MEMORY REPLAY
                  </p>
                  <h3 class="mt-1 text-lg font-bold text-slate-700">
                    那一天的片段
                  </h3>
                </div>

                <button
                  type="button"
                  class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/85 bg-white/55 text-lg text-slate-500 shadow-sm backdrop-blur transition hover:bg-white/80 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-violet-200/60 lg:flex"
                  aria-label="关闭往日日历"
                  @click="closeHistory"
                >
                  ×
                </button>
              </header>

              <div
                v-if="!selectedHistoryRecord"
                class="mt-8 flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-violet-200/80 bg-white/25 px-6 text-center"
              >
                <div
                  class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-200/80 to-rose-200/70 text-2xl shadow-inner"
                >
                  ◌
                </div>
                <p class="mt-4 text-sm font-semibold text-slate-600">
                  选择有颜色的日期
                </p>
                <p class="mt-2 max-w-56 text-xs leading-5 text-slate-400">
                  这里会展开完整日记、双 Agent 对话，并同步切换情绪雷达图。
                </p>
              </div>

              <div v-else class="mt-5 space-y-5">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-full border px-3 py-1.5 text-xs font-semibold"
                    :class="selectedHistoryTheme.chip"
                  >
                    {{ formatHistoryDate(selectedHistoryRecord.dateKey) }}
                  </span>
                  <span class="text-xs text-slate-400">
                    {{ formatHistoryTime(selectedHistoryRecord.createdAt) }}
                  </span>
                  <span
                    v-if="selectedHistoryTheme"
                    class="rounded-full border border-white/80 bg-white/45 px-2.5 py-1 text-[10px] font-semibold text-slate-500"
                  >
                    主导 · {{ getDominantEmotion(selectedHistoryRecord.emotionScores).name }}
                  </span>
                </div>

                <div
                  v-if="selectedDayRecords.length > 1"
                  class="flex flex-wrap gap-2"
                >
                  <button
                    v-for="(record, index) in selectedDayRecords"
                    :key="record.id"
                    type="button"
                    class="rounded-full border px-3 py-1.5 text-[10px] font-semibold transition"
                    :class="selectedHistoryRecord.id === record.id
                      ? 'border-violet-300 bg-violet-100/80 text-violet-700'
                      : 'border-white/80 bg-white/40 text-slate-500 hover:bg-white/70'"
                    @click="selectHistoryRecord(record)"
                  >
                    记录 {{ index + 1 }} · {{ formatHistoryTime(record.createdAt) }}
                  </button>
                </div>

                <div class="grid grid-cols-5 gap-1.5">
                  <div
                    v-for="emotion in emotionData"
                    :key="emotion.name"
                    class="rounded-xl border border-white/80 bg-white/40 px-1 py-2 text-center shadow-sm"
                  >
                    <p class="text-[9px] text-slate-400">{{ emotion.name }}</p>
                    <p class="mt-1 text-sm font-bold text-slate-700">
                      {{ selectedHistoryRecord.emotionScores[emotion.name] }}
                    </p>
                  </div>
                </div>

                <section>
                  <h4 class="text-xs font-bold tracking-wider text-slate-500">
                    完整日记
                  </h4>
                  <div
                    class="mt-2 whitespace-pre-wrap break-words rounded-2xl border border-white/85 bg-white/50 px-4 py-4 text-sm leading-7 text-slate-600 shadow-inner shadow-violet-900/5"
                  >
                    {{ selectedHistoryRecord.diary }}
                  </div>
                </section>

                <section>
                  <h4 class="text-xs font-bold tracking-wider text-slate-500">
                    双 Agent 对话
                  </h4>
                  <div class="mt-3 space-y-3">
                    <article
                      v-for="(message, index) in selectedHistoryRecord.dialogue"
                      :key="`${message.role}-${index}-${message.content}`"
                      class="flex items-start gap-2.5"
                      :class="message.role === 'logic' ? 'flex-row-reverse' : ''"
                    >
                      <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/90 text-[10px] font-bold shadow-sm"
                        :class="message.role === 'feel'
                          ? 'bg-rose-100 text-rose-500'
                          : 'bg-sky-100 text-sky-600'"
                      >
                        {{ message.role === 'feel' ? '感' : '理' }}
                      </div>
                      <div
                        class="max-w-[84%] rounded-2xl border px-3.5 py-2.5 text-xs leading-6 shadow-sm"
                        :class="message.role === 'feel'
                          ? 'rounded-tl-sm border-white/85 bg-white/60 text-slate-600'
                          : 'rounded-tr-sm border-sky-100/90 bg-sky-50/70 text-slate-600'"
                      >
                        {{ message.content }}
                      </div>
                    </article>
                  </div>
                </section>
              </div>
            </aside>
          </section>
        </div>
      </Teleport>
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

.history-backdrop {
  animation: history-backdrop-in 0.2s ease-out both;
}

.history-modal-panel {
  animation: history-panel-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes radar-scan {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes history-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes history-panel-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
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
  .chat-message,
  .history-backdrop,
  .history-modal-panel {
    animation: none;
  }
}
</style>
