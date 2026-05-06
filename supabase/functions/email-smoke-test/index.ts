function fmtErr(e: unknown): unknown {
  if (e && typeof e === 'object') {
    const anyE = e as any
    return {
      message: anyE.message,
      code: anyE.code,
      details: anyE.details,
      hint: anyE.hint,
    }
  }
  return String(e)
}
// Smoke-test endpoint for email RPCs and the email_send_log insert path.
// Verifies at runtime that the pgmq RPC wrappers exist with the expected
// signatures and that the email_send_log row shape is accepted by the DB.
//
// Call with: GET /functions/v1/email-smoke-test
// Returns 200 with { ok: true, checks: [...] } when all probes pass.
// Returns 500 with { ok: false, checks: [...] } on any failure.
//
// This is non-destructive: it only enqueues + immediately deletes a probe
// message, and inserts a clearly-tagged row into email_send_log.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type Check = {
  name: string
  ok: boolean
  detail?: unknown
}

async function run(): Promise<{ ok: boolean; checks: Check[] }> {
  const checks: Check[] = []
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    return {
      ok: false,
      checks: [{ name: 'env', ok: false, detail: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }],
    }
  }

  const supabase: any = createClient(supabaseUrl, serviceKey)
  const probeId = `smoke-${crypto.randomUUID()}`

  // 1. enqueue_email RPC
  let enqueuedMsgId: number | null = null
  try {
    const { data, error } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: { message_id: probeId, smoke_test: true },
    })
    if (error) throw error
    enqueuedMsgId = typeof data === 'number' ? data : Array.isArray(data) ? data[0] : null
    checks.push({ name: 'rpc:enqueue_email', ok: true, detail: { msg_id: enqueuedMsgId } })
  } catch (e) {
    checks.push({ name: 'rpc:enqueue_email', ok: false, detail: fmtErr(e) })
  }

  // 2. read_email_batch RPC (just verify it accepts the args and returns array)
  try {
    const { data, error } = await supabase.rpc('read_email_batch', {
      queue_name: 'transactional_emails',
      vt: 1,
      batch_size: 1,
    })
    if (error) throw error
    checks.push({
      name: 'rpc:read_email_batch',
      ok: Array.isArray(data),
      detail: { returned: Array.isArray(data) ? data.length : typeof data },
    })
  } catch (e) {
    checks.push({ name: 'rpc:read_email_batch', ok: false, detail: fmtErr(e) })
  }

  // 3. delete_email RPC (cleanup probe message)
  if (enqueuedMsgId !== null) {
    try {
      const { error } = await supabase.rpc('delete_email', {
        queue_name: 'transactional_emails',
        message_id: enqueuedMsgId,
      })
      if (error) throw error
      checks.push({ name: 'rpc:delete_email', ok: true })
    } catch (e) {
      checks.push({ name: 'rpc:delete_email', ok: false, detail: fmtErr(e) })
    }
  }

  // 4. move_to_dlq RPC signature (call with a non-existent msg_id; we only
  //    need to confirm the wrapper accepts the arg shape — an "unknown msg"
  //    error is acceptable, a missing-function error is not.)
  try {
    const { error } = await supabase.rpc('move_to_dlq', {
      source_queue: 'transactional_emails',
      dlq_name: 'transactional_emails_dlq',
      message_id: 999_999_999_999,
      payload: { smoke_test: true, message_id: probeId },
    })
    const msg = error ? String(error.message ?? error) : ''
    const signatureOk = !error || !/function .*does not exist|Could not find the function/i.test(msg)
    checks.push({
      name: 'rpc:move_to_dlq:signature',
      ok: signatureOk,
      detail: error ? msg : 'accepted',
    })
  } catch (e) {
    checks.push({ name: 'rpc:move_to_dlq:signature', ok: false, detail: fmtErr(e) })
  }

  // 5. email_send_log insert shape
  try {
    const { error } = await supabase.from('email_send_log').insert({
      message_id: probeId,
      template_name: 'smoke_test',
      recipient_email: 'smoke-test@example.invalid',
      status: 'pending',
      error_message: 'smoke test row',
      metadata: { smoke_test: true },
    })
    if (error) throw error
    checks.push({ name: 'insert:email_send_log', ok: true })
  } catch (e) {
    checks.push({ name: 'insert:email_send_log', ok: false, detail: fmtErr(e) })
  }

  const ok = checks.every((c) => c.ok)
  return { ok, checks }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const result = await run()
    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }, null, 2),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})