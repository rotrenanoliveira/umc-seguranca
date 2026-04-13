import { env } from '@/environment-variables'
import { app } from './app'

app.listen({
  port: env.APP_PORT,
  host: '0.0.0.0',
})
