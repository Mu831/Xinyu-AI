const COMPANION_PROFILE_STORAGE_KEY = 'xinyu.companion.profile.v1'
const COMPANION_PROFILE_VERSION = 1

const DEFAULT_COMPANION_PROFILE = {
  feel: {
    name: 'FEEL',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  },
  logic: {
    name: 'LOGIC',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
  },
}

const isSupportedAvatar = (value) => {
  return (
    typeof value === 'string' &&
    (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(value) ||
      value.startsWith('https://api.dicebear.com/'))
  )
}

const normalizeCompanion = (value, fallback) => {
  const name =
    typeof value?.name === 'string' && value.name.trim()
      ? value.name.trim().slice(0, 12)
      : fallback.name
  const avatar = isSupportedAvatar(value?.avatar)
    ? value.avatar
    : fallback.avatar

  return { name, avatar }
}

export const createDefaultCompanionProfile = () => ({
  feel: { ...DEFAULT_COMPANION_PROFILE.feel },
  logic: { ...DEFAULT_COMPANION_PROFILE.logic },
})

export const loadCompanionProfile = () => {
  const fallback = createDefaultCompanionProfile()

  try {
    const rawValue = window.localStorage.getItem(
      COMPANION_PROFILE_STORAGE_KEY,
    )

    if (!rawValue) return fallback

    const parsed = JSON.parse(rawValue)

    return {
      feel: normalizeCompanion(parsed?.feel, fallback.feel),
      logic: normalizeCompanion(parsed?.logic, fallback.logic),
    }
  } catch {
    return fallback
  }
}

export const saveCompanionProfile = (profile) => {
  const fallback = createDefaultCompanionProfile()
  const normalized = {
    feel: normalizeCompanion(profile?.feel, fallback.feel),
    logic: normalizeCompanion(profile?.logic, fallback.logic),
  }

  if (!profile?.feel?.name?.trim() || !profile?.logic?.name?.trim()) {
    throw new Error('两位伙伴都需要有一个名字。')
  }

  window.localStorage.setItem(
    COMPANION_PROFILE_STORAGE_KEY,
    JSON.stringify({
      version: COMPANION_PROFILE_VERSION,
      updatedAt: new Date().toISOString(),
      ...normalized,
    }),
  )

  return normalized
}

export { COMPANION_PROFILE_STORAGE_KEY }
