export interface Env {
  CRON_URL: string;
  CRON_SECRET: string;
}

async function ping(env: Env): Promise<{ status: number; body: string }> {
  const res = await fetch(env.CRON_URL, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  return { status: res.status, body: await res.text() };
}

export default {
  // Fired by the cron trigger in wrangler.toml.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      ping(env).then(({ status, body }) => {
        console.log(`[cron] ${env.CRON_URL} -> ${status} ${body.slice(0, 300)}`);
      })
    );
  },

  // Optional: hit the worker's URL in a browser to trigger a run manually.
  async fetch(_request: Request, env: Env): Promise<Response> {
    const { status, body } = await ping(env);
    return new Response(`cron -> ${status}\n${body}`, {
      status: status === 200 ? 200 : 502,
      headers: { "content-type": "text/plain" },
    });
  },
};
