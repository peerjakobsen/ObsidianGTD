# Spec Summary (Lite)

Implement a conversational GTD Assistant sidebar that uses a new `BedrockClient.converse({ system, messages, inferenceConfig })` API to support multi‑turn refinement of tasks and an “Insert Tasks” action to commit results into the current note. Strict JSON mode remains the default to keep outputs parseable and consistent with the existing one‑shot flow.
