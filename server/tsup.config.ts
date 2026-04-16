import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/infra/http/server.ts',
  },
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  dts: false,
  bundle: true,
  outDir: 'dist',
})
