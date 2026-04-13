import { Resend } from 'resend'
import { env } from '@/environment-variables'

export const resend = new Resend(env.RESEND_API_KEY)
