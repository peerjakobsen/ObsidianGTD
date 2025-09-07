# Spec Summary (Lite)

Scan the vault for GTD project notes, call Bedrock once per project to produce a short, strict-JSON recap (summary, health, counts, risks, recommendations), and write a single idempotent “Project Index” note with a dashboard table and brief per-project bullets. Use content hashing and a queue to make re-runs fast, with a force-refresh option.

