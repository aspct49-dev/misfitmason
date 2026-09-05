'use client';

import { useState } from 'react';

/** The referral code, click to copy. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard is unavailable in insecure contexts and some browsers. The
      // code is on screen regardless, so failing quietly is the right outcome.
    }
  }

  return (
    <button className="code-copy" onClick={copy} aria-label={`Copy referral code ${code}`}>
      {code}
      <span className="code-copy-state" aria-live="polite">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </button>
  );
}
