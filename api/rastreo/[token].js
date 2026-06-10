import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

// Escapa texto para insertarlo en HTML (contenido y atributos con comillas dobles).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req) {
  const rawToken = req.url.split('/rastreo/')[1]?.split('?')[0] ?? ''

  // El token se genera como 32 hex (crypto.randomUUID sin guiones). Rechazar
  // cualquier cosa fuera de ese alfabeto evita inyección reflejada en el HTML.
  const token = /^[a-fA-F0-9]{16,64}$/.test(rawToken) ? rawToken : ''

  const ua = req.headers.get('user-agent') ?? ''
  const isBot = /whatsapp|telegrambot|twitterbot|facebookexternalhit|linkedinbot|slackbot/i.test(ua)

  // Token inválido o visitante humano → al SPA (que valida y muestra el estado).
  if (!token || !isBot) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/rastreo/${encodeURIComponent(rawToken)}?_spa=1` },
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  // La tabla está cerrada por RLS; se lee por RPC SECURITY DEFINER (token exacto).
  const { data } = await supabase.rpc('rastreo_por_token', { p_token: token })
  const row = Array.isArray(data) ? data[0] : null
  const vigente = row && new Date(row.expires_at) > new Date()

  const nombre = escapeHtml(vigente ? (row.wialon_nombre ?? 'Unidad GPS') : 'Unidad GPS')
  const expira = escapeHtml(
    vigente
      ? `Válido hasta ${new Date(row.expires_at).toLocaleString('es-MX', {
          timeZone: 'America/Mexico_City',
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
        })}`
      : 'Link expirado'
  )

  // token ya validado contra [a-f0-9]{16,64}: seguro para interpolar.
  const spaUrl = `/rastreo/${token}?_spa=1`
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
  <meta http-equiv="refresh" content="0;url=${spaUrl}"/>
  <script>window.location.replace(${JSON.stringify(spaUrl)})</script>
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  })
}
