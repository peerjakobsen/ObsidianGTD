# Code Style Guide

## Context

Global code style rules for Agent OS Python projects.

<conditional-block context-check="general-formatting">
IF this General Formatting section already read in current context:
  SKIP: Re-reading this section
  NOTE: "Using General Formatting rules already in context"
ELSE:
  READ: The following formatting rules

## General Formatting (Python)

### Tooling
- Formatter: Ruff (Black-compatible; line length 88 unless overridden)
- Linter: Ruff (includes import sorting via isort rules)
- Type checker: mypy

### Indentation & Layout
- Use 4 spaces for indentation (never tabs)
- Keep lines <= 88 chars (Ruff wraps automatically)
- One blank line between logically related code blocks
- Two blank lines before/after top-level class and function definitions

### Naming Conventions
- **Modules/Packages**: `snake_case`, short, lowercase (e.g., `user_utils`, `billing`)
- **Classes**: `PascalCase` (e.g., `UserProfile`, `PaymentProcessor`)
- **Functions/Methods**: `snake_case` (e.g., `calculate_total`)
- **Variables**: `snake_case` (e.g., `user_profile`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Private/Internal**: prefix with single underscore (e.g., `_normalize_email`)
- Reserve dunder names (`__init__`, `__enter__`) for Python internals only

### Imports
- Group imports: standard library, third-party, local — in that order
- Use absolute imports; use explicit relative imports only within a package
- One module per import line; avoid wildcard imports
- Let Ruff (isort rules) manage ordering and deduplication

### Strings
- Prefer f-strings for interpolation (e.g., `f"Hello, {name}"`)
- The formatter (Ruff) normalizes quote style; be consistent within a file
- Use triple quotes for multi-line strings and docstrings
- Avoid `%` formatting and prefer f-strings over `str.format`

### Comments & Docstrings
- Write docstrings for public modules, classes, and functions
- Docstring style: Google or NumPy (project may choose); be consistent
- Block comments start with `# ` on their own line; keep them concise
- Inline comments are separated by at least two spaces and start with `# `
- Explain the "why" when intent isn’t obvious; avoid narrating the code

### Typing
- Use type hints for public functions, methods, and class attributes
- Prefer modern built-ins (e.g., `list[str]`, `dict[str, int]`) on Python 3.9+
- Use `| None` instead of `Optional[T]` unless consistency dictates otherwise
- Consider `from __future__ import annotations` if supporting <3.11
- Run mypy in CI for changed code

### Pythonic Practices
- Compare to `None` with `is`/`is not` (not `==`/`!=`)
- Avoid mutable default arguments (use `None` and assign inside)
- Prefer list/dict/set comprehensions over `map`/`filter` for clarity
- Use `logging` instead of `print` in library/application code
- Raise specific exceptions; avoid bare `except:`; catch only what you handle
- Keep functions small and single-purpose; extract helpers when logic grows

</conditional-block>
