const HISTORY_STORAGE_KEY = 'xinyu.history.v1'
const HISTORY_SCHEMA_VERSION = 1

// 通常保留最近 100 条。按每天 1 条计算，可以覆盖约 3 个月。
const HISTORY_MAX_RECORDS = 100

const EMOTION_KEYS = ['焦虑', '喜悦', '孤独', '期待', '平静']
const DIALOGUE_ROLES = ['feel', 'logic']

const pad2 = (value) => String(value).padStart(2, '0')

const toLocalDateKey = (date) => {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-')
}

const getStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('当前环境不支持 localStorage。')
  }

  return window.localStorage
}

const createHistoryId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join('-')
}

const compareByCreatedAtDesc = (a, b) => {
  const aTime = Date.parse(a?.createdAt) || 0
  const bTime = Date.parse(b?.createdAt) || 0
  return bTime - aTime
}

const isQuotaError = (error) => {
  return (
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    error?.code === 1014
  )
}

const normalizeEmotionScores = (source) => {
  if (!source || typeof source !== 'object') {
    throw new Error('历史数据缺少五维情绪分数。')
  }

  return Object.fromEntries(
    EMOTION_KEYS.map((emotionName) => {
      const rawValue = source[emotionName]

      if (rawValue === undefined || rawValue === null || rawValue === '') {
        throw new Error(`历史数据缺少“${emotionName}”分数。`)
      }

      const score = Number(rawValue)

      if (!Number.isFinite(score)) {
        throw new Error(`“${emotionName}”分数必须是有效数字。`)
      }

      return [emotionName, Math.round(Math.min(100, Math.max(0, score)))]
    }),
  )
}

const normalizeDialogue = (dialogue) => {
  if (!Array.isArray(dialogue) || dialogue.length === 0) {
    throw new Error('历史数据缺少双 Agent 对话。')
  }

  const normalized = dialogue.map((message, index) => {
    const role = message?.role
    const content =
      typeof message?.content === 'string' ? message.content.trim() : ''

    if (!DIALOGUE_ROLES.includes(role)) {
      throw new Error(`第 ${index + 1} 条对话的角色无效。`)
    }

    if (!content) {
      throw new Error(`第 ${index + 1} 条对话内容为空。`)
    }

    return { role, content }
  })

  const hasFeel = normalized.some((message) => message.role === 'feel')
  const hasLogic = normalized.some((message) => message.role === 'logic')

  if (!hasFeel || !hasLogic) {
    throw new Error('双 Agent 对话必须同时包含 feel 和 logic。')
  }

  return normalized
}

const readHistoryDocument = () => {
  const storage = getStorage()
  const rawValue = storage.getItem(HISTORY_STORAGE_KEY)

  if (!rawValue) {
    return {
      version: HISTORY_SCHEMA_VERSION,
      updatedAt: null,
      records: [],
    }
  }

  let parsed

  try {
    parsed = JSON.parse(rawValue)
  } catch {
    throw new Error('本地历史数据无法解析，已停止写入以避免覆盖。')
  }

  // 同时兼容直接保存数组的旧格式。
  const records = Array.isArray(parsed) ? parsed : parsed?.records

  if (!Array.isArray(records)) {
    throw new Error('本地历史数据格式不正确，已停止写入以避免覆盖。')
  }

  return {
    version: Number(parsed?.version) || HISTORY_SCHEMA_VERSION,
    updatedAt: parsed?.updatedAt ?? null,
    records: records.sort(compareByCreatedAtDesc),
  }
}

const writeHistoryRecords = (records) => {
  const storage = getStorage()
  const updatedAt = new Date().toISOString()

  // 正常最多保留 100 条；如果仍超过浏览器配额，再淘汰旧记录。
  let keepCount = Math.min(records.length, HISTORY_MAX_RECORDS)

  while (keepCount > 0) {
    const keptRecords = records.slice(0, keepCount)
    const document = {
      version: HISTORY_SCHEMA_VERSION,
      updatedAt,
      records: keptRecords,
    }

    try {
      storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(document))
      return keptRecords
    } catch (error) {
      if (!isQuotaError(error)) {
        throw error
      }

      if (keepCount === 1) {
        throw new Error('单条历史记录过大，浏览器本地存储空间不足。')
      }

      // 配额不足时按 80% 递减，避免一条一条反复写入。
      keepCount = Math.max(1, Math.floor(keepCount * 0.8))
    }
  }

  throw new Error('无法写入历史记录。')
}

/**
 * 保存一次完整的心屿陪伴记录。
 *
 * 调用时机：
 * 模型请求成功，并完成雷达图和双 Agent 对话渲染后。
 *
 * @param {{
 *   diary: string,
 *   emotions?: Record<string, number>,
 *   emotionScores?: Record<string, number>,
 *   dialogue: Array<{ role: 'feel' | 'logic', content: string }>,
 *   createdAt?: string | number | Date
 * }} data
 */
export const saveHistoryData = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('saveHistoryData 需要接收记录对象。')
  }

  const diary = typeof data.diary === 'string' ? data.diary.trim() : ''

  if (!diary) {
    throw new Error('历史记录中的日记内容不能为空。')
  }

  const emotionSource = data.emotionScores ?? data.emotions
  const emotionScores = normalizeEmotionScores(emotionSource)
  const dialogue = normalizeDialogue(data.dialogue)

  const createdAt = data.createdAt
    ? new Date(data.createdAt)
    : new Date()

  if (Number.isNaN(createdAt.getTime())) {
    throw new Error('历史记录的日期时间无效。')
  }

  const dateKey = toLocalDateKey(createdAt)

  const record = {
    id: createHistoryId(),
    createdAt: createdAt.toISOString(),
    dateKey,
    monthKey: dateKey.slice(0, 7),
    diary,
    emotionScores,
    dialogue,
  }

  const historyDocument = readHistoryDocument()

  const records = [
    record,
    ...historyDocument.records.filter((item) => item?.id !== record.id),
  ].sort(compareByCreatedAtDesc)

  const savedRecords = writeHistoryRecords(records)

  return {
    record,
    total: savedRecords.length,
    evicted: Math.max(0, records.length - savedRecords.length),
  }
}

// 读取全部记录，默认按时间倒序。
export const getHistoryData = () => {
  return readHistoryDocument().records
}

// 按月份查询，例如 getHistoryByMonth('2026-11')。
export const getHistoryByMonth = (monthKey) => {
  return getHistoryData().filter((record) => record.monthKey === monthKey)
}

// 按天查询，例如 getHistoryByDay('2026-11-12')。
export const getHistoryByDay = (dateKey) => {
  return getHistoryData().filter((record) => record.dateKey === dateKey)
}

const averageEmotionScores = (scoreList) => {
  return Object.fromEntries(
    EMOTION_KEYS.map((emotionName) => {
      const values = scoreList
        .map((scores) => Number(scores?.[emotionName]))
        .filter(Number.isFinite)

      const average = values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0

      return [emotionName, average]
    }),
  )
}

const getDominantEmotion = (emotionScores) => {
  return EMOTION_KEYS.reduce(
    (dominant, emotionName) => {
      const score = emotionScores[emotionName] ?? 0

      return score > dominant.score
        ? { name: emotionName, score }
        : dominant
    },
    { name: EMOTION_KEYS[0], score: emotionScores[EMOTION_KEYS[0]] ?? 0 },
  )
}

/**
 * 月度情绪汇总。
 *
 * 先计算每天的平均分，再计算整月平均分，
 * 避免某一天记录较多时过度影响整月情绪结果。
 */
export const getMonthlyEmotionSummary = (monthKey) => {
  const records = getHistoryByMonth(monthKey)

  if (records.length === 0) {
    return {
      monthKey,
      recordCount: 0,
      activeDays: 0,
      emotionScores: null,
      dominantEmotion: null,
      dailySummaries: [],
    }
  }

  const recordsByDay = new Map()

  for (const record of records) {
    if (!recordsByDay.has(record.dateKey)) {
      recordsByDay.set(record.dateKey, [])
    }

    recordsByDay.get(record.dateKey).push(record)
  }

  const dailySummaries = [...recordsByDay.entries()]
    .map(([dateKey, dayRecords]) => {
      const emotionScores = averageEmotionScores(
        dayRecords.map((record) => record.emotionScores),
      )

      return {
        dateKey,
        recordCount: dayRecords.length,
        emotionScores,
        dominantEmotion: getDominantEmotion(emotionScores),
      }
    })
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  const emotionScores = averageEmotionScores(
    dailySummaries.map((summary) => summary.emotionScores),
  )

  return {
    monthKey,
    recordCount: records.length,
    activeDays: dailySummaries.length,
    emotionScores,
    dominantEmotion: getDominantEmotion(emotionScores),
    dailySummaries,
  }
}