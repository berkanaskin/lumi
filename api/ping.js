export const runtime = 'nodejs';

export default async function handler() {
    return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
