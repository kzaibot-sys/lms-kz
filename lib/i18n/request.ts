import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const locale = cookieStore.get('locale')?.value || 'ru'
  const validLocale = ['ru', 'kz'].includes(locale) ? locale : 'ru'

  return {
    locale: validLocale,
    messages: (await import(`@/messages/${validLocale}.json`)).default,
  }
})
