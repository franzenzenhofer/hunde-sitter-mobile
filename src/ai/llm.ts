/**
 * Bello's real brain: a tiny LLM (SmolLM2-135M-Instruct) running fully in the
 * browser via wllama (llama.cpp compiled to WASM, CPU, mobile-capable). The
 * model is downloaded once (~105 MB) from the Hugging Face CDN and cached by
 * wllama, so later visits start instantly and work offline.
 *
 * We expose a tiny `LlmEngine` interface so the dog's decision logic
 * (`bello-brain`) depends only on this contract and can be unit-tested with a
 * fake. The wllama dependency is dynamically imported inside load() so it never
 * bloats the main bundle and only downloads when Bello wakes up.
 */
export type LlmChoice = { action: string; thought: string };

export type LlmEngine = {
  /** Download + initialise the model. onProgress reports 0..100. Idempotent. */
  load(onProgress?: (pct: number) => void): Promise<void>;
  isReady(): boolean;
  /** Ask the model to pick ONE action id from `actions`, with a short thought. */
  choose(input: { system: string; user: string; actions: string[] }): Promise<LlmChoice>;
};

const MODEL = {
  repo: 'bartowski/SmolLM2-135M-Instruct-GGUF',
  file: 'SmolLM2-135M-Instruct-Q4_K_M.gguf',
};
// Keep the context tiny: KV-cache memory scales with n_ctx and is the main
// cause of out-of-memory crashes on low-end mobile. Our prompts are short, so a
// small window is plenty and keeps Bello stable on phones.
const N_CTX = 512;
const MAX_TOKENS = 48;
// A single decision must finish in this long or we abort and surface a timeout
// rather than letting a stuck WASM inference freeze the dog forever.
const CHOOSE_TIMEOUT_MS = 30_000;
// wllama's WASM blob, served from the jsdelivr CDN (matches the installed
// version). Inlined to avoid bundling the WASM into our app.
const WASM_CONFIG = {
  default: 'https://cdn.jsdelivr.net/npm/@wllama/wllama@3.4.1/src/wasm/wllama.wasm',
};

export function createWllamaEngine(): LlmEngine {
  // `unknown` until loaded; we keep wllama's type loose to avoid importing it
  // eagerly (it would pull the WASM glue into the main chunk).
  let wllama: { createChatCompletion(o: unknown): Promise<unknown> } | null = null;
  let loading: Promise<void> | null = null;

  const doLoad = async (onProgress?: (pct: number) => void): Promise<void> => {
    const { Wllama } = await import('@wllama/wllama/esm/index.js');
    const inst = new Wllama(WASM_CONFIG);
    await inst.loadModelFromHF(MODEL, {
      n_ctx: N_CTX,
      progressCallback: ({ loaded, total }: { loaded: number; total: number }) =>
        onProgress?.(total > 0 ? Math.round((loaded / total) * 100) : 0),
    });
    wllama = inst as unknown as { createChatCompletion(o: unknown): Promise<unknown> };
  };

  const doChoose = async ({
    system,
    user,
    actions,
  }: {
    system: string;
    user: string;
    actions: string[];
  }): Promise<LlmChoice> => {
    if (!wllama) throw new Error('Bello brain not loaded yet');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CHOOSE_TIMEOUT_MS);
    try {
      const res = (await wllama.createChatCompletion({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.9,
        // Reuse the cached system-prompt KV across calls — faster, less work.
        cache_prompt: true,
        abortSignal: ctrl.signal,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'bello_action',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                thought: { type: 'string' },
                action: { type: 'string', enum: actions },
              },
              required: ['action', 'thought'],
            },
          },
        },
      })) as { choices?: Array<{ message?: { content?: string } }> };
      const content = res.choices?.[0]?.message?.content ?? '';
      return parseChoice(content, actions);
    } finally {
      clearTimeout(timer);
    }
  };

  // Serialise inference: concurrent createChatCompletion calls on one wllama
  // instance crash the WASM runtime. Every choose() waits for the previous one.
  let lock: Promise<unknown> = Promise.resolve();

  return {
    load: (onProgress) => {
      loading ??= doLoad(onProgress);
      return loading;
    },
    isReady: () => wllama !== null,
    choose: (input) => {
      const result = lock.then(() => doChoose(input));
      lock = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}

/**
 * Parse the model's JSON. No fallback: if the output isn't valid JSON with an
 * allowed `action`, we throw so the failure is surfaced (the json_schema grammar
 * should guarantee validity, so a throw here means something is genuinely wrong).
 */
export function parseChoice(content: string, actions: string[]): LlmChoice {
  let obj: Partial<LlmChoice>;
  try {
    obj = JSON.parse(content) as Partial<LlmChoice>;
  } catch {
    throw new Error(`Bello returned non-JSON output: ${JSON.stringify(content.slice(0, 200))}`);
  }
  if (typeof obj.action !== 'string' || !actions.includes(obj.action)) {
    throw new Error(
      `Bello chose an invalid action ${JSON.stringify(obj.action)} — allowed: ${actions.join(', ')}`,
    );
  }
  return { action: obj.action, thought: typeof obj.thought === 'string' ? obj.thought : '' };
}
