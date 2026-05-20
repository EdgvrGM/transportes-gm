import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const token = req.url.split('/rastreo/')[1]?.split('?')[0]

  const ua = req.headers.get('user-agent') ?? ''
  const isBot = /whatsapp|telegrambot|twitterbot|facebookexternalhit|linkedinbot|slackbot/i.test(ua)

  if (!isBot) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/rastreo/${token}?_spa=1` },
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const { data } = await supabase
    .from('RastreoCompartido')
    .select('wialon_nombre, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  const nombre = data?.wialon_nombre ?? 'Unidad GPS'
  const expira = data
    ? `Válido hasta ${new Date(data.expires_at).toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
      })}`
    : 'Link expirado'

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta property="og:title" content="🚛 ${nombre} — Rastreo en vivo"/>
  <meta property="og:description" content="${expira} · Transportes GM"/>
  <meta property="og:image" content="https://transportesgm.mx/img/LOGO.PNG"/>
  <meta property="og:url" content="https://transportesgm.mx/rastreo/${token}"/>
  <meta property="og:type" content="website"/>
  <meta name="twitter:card" content="summary"/>
  <meta http-equiv="refresh" content="0;url=/rastreo/${token}?_spa=1"/>
  <script>window.location.replace('/rastreo/${token}?_spa=1')</script>
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  })
}
