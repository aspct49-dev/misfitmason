import 'server-only';

import { PARTNERS } from './partners';
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES } from './vip.shared';

/**
 * VIP transfer applications.
 *
 * Someone already holding a VIP level at another casino applies to have it
 * matched on Roobet under the code. The application is a claim about play we
 * cannot see, so it comes with screenshots and a person reads it — nothing here
 * approves anything, it delivers the case to Discord.
 *
 * **None of it is stored.** The form posts, the images go straight to Discord
 * as attachments, and the request ends. Keeping a copy would mean holding other
 * people's account screenshots for no use at all: the webhook is the record.
 */

export {
  LOSSBACK_OPTIONS,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  type Lossback,
} from './vip.shared';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

/**
 * The first bytes each format must start with.
 *
 * A browser reports whatever `Content-Type` it likes, and so does an attacker.
 * Checking the actual bytes is what stops something that is not an image being
 * handed to Discord with an image's name on it.
 */
const MAGIC: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/jpg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

/** Strips anything that would change how text reads inside an embed, and caps it. */
export function clean(input: string, max = 100): string {
  return input
    .replace(/[<>@]/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/`/g, "'")
    .trim()
    .slice(0, max);
}

export function checkTotalSize(files: File[]): string | null {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    return `That is ${(total / 1024 / 1024).toFixed(0)}MB of screenshots. Keep it under ${
      MAX_TOTAL_BYTES / 1024 / 1024
    }MB in total.`;
  }
  return null;
}

export async function checkImage(file: File): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return `${file.name}: only JPG, PNG and WEBP images are accepted.`;
  }
  if (file.size > MAX_FILE_BYTES) return `${file.name}: over the 8MB limit.`;
  if (file.size === 0) return `${file.name}: that file is empty.`;

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const signatures = MAGIC[file.type];
  if (!signatures?.some((sig) => sig.every((b, i) => bytes[i] === b))) {
    return `${file.name}: that is not the kind of file it says it is.`;
  }
  return null;
}

export interface Application {
  username: string;
  /** From the Discord session where there is one, typed where there is not. */
  discord: string;
  currentCasino: string;
  lossback: string;
  games: string;
  notes: string;
  recent: File[];
  lifetime: File[];
}

/**
 * Discord rejects filenames with anything unusual in them, and the originals
 * are whatever the applicant's phone called them.
 */
function safeName(name: string, prefix: string, i: number): string {
  const base = (name.split(/[\\/]/).pop() ?? 'image')
    .replace(/[^A-Za-z0-9.\-_ ]/g, '_')
    .replace(/_+/g, '_')
    .slice(-40);
  return `${prefix}-${i + 1}-${base}`;
}

export async function deliver(app: Application): Promise<{ ok: boolean; error?: string }> {
  const webhook = process.env.DISCORD_CLAIM_WEBHOOK_URL?.trim();
  if (!webhook) return { ok: false, error: 'No webhook configured.' };

  const embed = {
    title: 'VIP transfer application',
    color: 0xe31b45,
    fields: [
      { name: `${PARTNERS.roobet.name} name`, value: `\`${app.username}\``, inline: true },
      { name: 'Discord', value: `\`${app.discord}\``, inline: true },
      { name: 'Plays at', value: app.currentCasino || 'Not given', inline: true },
      { name: 'Current lossback', value: `\`${app.lossback}\``, inline: true },
      { name: 'Proof', value: `${app.recent.length} recent, ${app.lifetime.length} lifetime`, inline: true },
      { name: 'Games played', value: app.games || 'Not given', inline: false },
      ...(app.notes ? [{ name: 'Notes', value: app.notes, inline: false }] : []),
    ],
    footer: { text: 'misfitmason.com' },
    timestamp: new Date().toISOString(),
  };

  const form = new FormData();
  form.append(
    'payload_json',
    JSON.stringify({
      username: 'Misfit Mason claims',
      // Every field is applicant input: nothing here may ping anybody.
      allowed_mentions: { parse: [] },
      embeds: [embed],
    }),
  );

  const files = [
    ...app.recent.map((f, i) => [f, safeName(f.name, 'recent', i)] as const),
    ...app.lifetime.map((f, i) => [f, safeName(f.name, 'lifetime', i)] as const),
  ];
  files.forEach(([file, name], i) => form.append(`files[${i}]`, file, name));

  try {
    // Discord 403s requests from unfamiliar user agents, with nothing useful in
    // the body. Content-Type is left to FormData so the multipart boundary is
    // the one it actually wrote.
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'user-agent': 'MisfitMasonClaims/1.0 (+https://www.misfitmason.com)' },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[vip] webhook rejected:', res.status, body.slice(0, 200));
      return { ok: false, error: `Discord returned ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error('[vip] webhook threw:', error);
    return { ok: false, error: 'Could not reach Discord' };
  }
}

/**
 * Burst limit, per address and in memory: five attempts in fifteen minutes,
 * which is about stopping a script hammering the endpoint. It resets on a
 * redeploy and does not hold across instances, and that is fine — the signed
 * cooldown cookie and Discord sign-in are what throttle a person.
 */
const burst = new Map<string, { count: number; until: number }>();
const BURST_WINDOW = 15 * 60_000;
const BURST_LIMIT = 5;

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const record = burst.get(ip);
  if (!record || now > record.until) {
    burst.set(ip, { count: 1, until: now + BURST_WINDOW });
    return false;
  }
  record.count += 1;
  return record.count > BURST_LIMIT;
}
