#!/usr/bin/env python3
"""
Shared LLM client for the content engine.

Resolution order (first that works wins):
  1. Anthropic SDK  — works headless / in CI when ANTHROPIC_API_KEY is set.
  2. OpenRouter     — OPENROUTER_API_KEY, OpenAI-compatible chat completions.
     Primary in CI as of 2026-07-24: the direct Anthropic account ran out of
     API credits, which (with the secret also unset) made every daily run
     silently ship the fallback template from 2026-07-05 to 2026-07-24.
  3. OpenAI         — OPENAI_API_KEY. Added 2026-08-27 after the OpenRouter
     account also ran out of funds (HTTP 402), stalling every daily/weekly/
     monthly generation run. This key is already an authorised repo secret
     funding embeddings (next/scripts/embed-entity-index.mjs) and the
     concierge corpus refresh (ops/scripts/refresh-corpus.mjs) — reusing it
     here draws on existing, already-approved spend rather than committing
     new budget.
  4. `claude` CLI   — for OpenClaw / local dev environments.
  5. None           — nothing available, so callers SKIP (never fabricate).

Stdlib-only import surface; the `anthropic` package is imported lazily so this
module is safe to import even where the SDK isn't installed.
"""

from __future__ import annotations

import os
import subprocess

# Default model: strong quality/cost balance for editorial drafting. Override
# per-call or via PI_LLM_MODEL. IDs: claude-opus-4-8 / claude-sonnet-5 / claude-haiku-4-5.
DEFAULT_MODEL = os.environ.get("PI_LLM_MODEL", "claude-sonnet-5")
# OpenRouter uses its own model slugs; keep it pinned to the known-good
# Anthropic route rather than mapping DEFAULT_MODEL across providers.
OPENROUTER_MODEL = os.environ.get("PI_OPENROUTER_MODEL", "anthropic/claude-sonnet-4-6")
# Cost-controlled default so reusing the shared, already-funded OpenAI key
# doesn't meaningfully add to its existing embeddings/concierge spend.
OPENAI_MODEL = os.environ.get("PI_OPENAI_MODEL", "gpt-4o-mini")
DEFAULT_TIMEOUT = 120


def complete(prompt: str, system: str = "", model: str | None = None,
             max_tokens: int = 2000, timeout: int = DEFAULT_TIMEOUT) -> str | None:
    """Return the model's text, or None if no backend is available."""
    model = model or DEFAULT_MODEL
    out = _try_sdk(prompt, system, model, max_tokens, timeout)
    if out is not None:
        return out
    out = _try_openrouter(prompt, system, max_tokens, timeout)
    if out is not None:
        return out
    out = _try_openai(prompt, system, max_tokens, timeout)
    if out is not None:
        return out
    return _try_cli(prompt, system, timeout)


def available() -> str:
    """Report which backend would be used: 'sdk', 'openrouter', 'openai', 'cli', or 'none'."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            import anthropic  # noqa: F401
            return "sdk"
        except ImportError:
            pass
    if os.environ.get("OPENROUTER_API_KEY"):
        try:
            import requests  # noqa: F401
            return "openrouter"
        except ImportError:
            pass
    if os.environ.get("OPENAI_API_KEY"):
        try:
            import requests  # noqa: F401
            return "openai"
        except ImportError:
            pass
    try:
        subprocess.run(["claude", "--version"], capture_output=True, timeout=10)
        return "cli"
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return "none"


def _try_sdk(prompt: str, system: str, model: str, max_tokens: int,
             timeout: int) -> str | None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
    except ImportError:
        return None
    try:
        client = anthropic.Anthropic()
        kwargs = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
            "timeout": timeout,
        }
        if system:
            kwargs["system"] = system
        msg = client.messages.create(**kwargs)
        text = "".join(
            getattr(b, "text", "") for b in msg.content
            if getattr(b, "type", None) == "text"
        ).strip()
        return text or None
    except Exception as e:  # network/auth/rate-limit — degrade, don't crash the loop
        print(f"  LLM SDK error: {e}")
        return None


def _try_openrouter(prompt: str, system: str, max_tokens: int,
                    timeout: int) -> str | None:
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        return None
    try:
        import requests
    except ImportError:
        return None
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    try:
        r = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://peninsulainsider.com.au",
                "X-Title": "Peninsula Insider Content Engine",
            },
            json={
                "model": OPENROUTER_MODEL,
                "max_tokens": max_tokens,
                "messages": messages,
            },
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        if "error" in data:  # OpenRouter can 200 with an error body
            print(f"  LLM OpenRouter error: {data['error']}")
            return None
        text = (data["choices"][0]["message"]["content"] or "").strip()
        return text or None
    except Exception as e:  # network/auth/rate-limit — degrade, don't crash the loop
        print(f"  LLM OpenRouter error: {e}")
        return None


def _try_openai(prompt: str, system: str, max_tokens: int,
                 timeout: int) -> str | None:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    try:
        import requests
    except ImportError:
        return None
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "max_tokens": max_tokens,
                "messages": messages,
            },
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        if "error" in data:  # OpenAI can 200 with an error body
            print(f"  LLM OpenAI error: {data['error']}")
            return None
        text = (data["choices"][0]["message"]["content"] or "").strip()
        return text or None
    except Exception as e:  # network/auth/rate-limit — degrade, don't crash the loop
        print(f"  LLM OpenAI error: {e}")
        return None


def _try_cli(prompt: str, system: str, timeout: int) -> str | None:
    cmd = ["claude", "-p", prompt]
    if system:
        cmd += ["--system", system]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return None
    if r.returncode == 0 and r.stdout.strip():
        return r.stdout.strip()
    return None
