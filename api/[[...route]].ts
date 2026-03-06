import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import serverApp from './_server/index'

// Vercel Edge Runtime: Web-standard fetch/crypto/atob available natively,
// no cold-start overhead, process.env supported.
export const config = { runtime: 'edge' }

const app = new Hono().basePath('/api')
app.route('/', serverApp)

export default handle(app)
