# pi on the MacBook Pro M2, 16 GB

The 13" MacBook Pro (2022, base M2, 100 GB/s memory bandwidth) can't hold the Mac mini's Qwen3.6-35B-A3B.
Here pi is **read-only**: it reads the project, searches the web and drives Safari, then answers with code ready to
paste. You apply it and fix small errors yourself. It runs on one of two small models in LM Studio:

| Model | In pi | Build | Size | Speed on the M2 | Memory during `next build` |
|---|---|---|---|---|---|
| [LFM3-1.7B](https://huggingface.co/LiquidAI/LFM3-1.7B) | default | [LiquidAI/LFM3-1.7B-MLX-4bit](https://huggingface.co/LiquidAI/LFM3-1.7B-MLX-4bit) | 1 GB | ~70 tokens/s | ~10 GB |
| [Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B) | fallback | LM Studio's staff pick `qwen/qwen3.5-4b`, MLX 4-bit | 3 GB | ~30 tokens/s | ~13 GB |

Speed and memory were measured on the Mac mini and scaled to the M2's memory bandwidth. Memory is the whole Mac:
about 5 GB for macOS, 1.5 GB for LM Studio, then the model, its context and the build.

## What to expect

Give it small tasks. Neither model builds a whole site from one long spec in under 30 minutes.

Why read-only: with write access LFM3 does work as an agent, but it falls into loops of fixing its own fixes after
lint and whole-file checks. In a test of five small tasks on a finished Next.js site, one run each, as an agent it
solved 3 (Qwen3.5-4B 4, with thinking on; this config turns Qwen's thinking off for speed). Read-only, LFM3 answered
the region filter it had failed as an agent with a whole file that built on the first paste.

When something fails, run the command yourself and paste the error into the task: without a shell the model can't
see it and guesses. With only "the build fails", LFM3 once blamed the wrong file.

LFM3 is the default: the same results at twice the speed and with 3 GB less memory. Liquid post-trained it for agent
harnesses, pi among them, though its model card says it's "not recommended for agentic coding or complex multi-step
reasoning due to its small size". When it gets stuck on logic, switch to Qwen3.5-4B with `/model`.

## Install

Do steps 1–3 of [New machine](../README.md#new-machine), then instead of step 4:

```sh
~/.lmstudio/bin/lms bootstrap
lms runtime get omlx -y                                         # LFM3 runs only on LM Studio's oMLX engine
lms runtime select omlx-mac-arm64-apple-metal-advsimd --latest  # all MLX models now load with oMLX (or ⌘⇧R → MLX → oMLX)
lms get https://huggingface.co/LiquidAI/LFM3-1.7B-MLX-4bit -y
lms get qwen/qwen3.5-4b --mlx --select                          # pick 4-bit
lms ls   # ids must be lfm3-1.7b-mlx and qwen/qwen3.5-4b, as in pi/models.json
mkdir -p ~/.pi/agent && cp -R dotfiles/pi/ ~/.pi/agent/         # extensions
cp dotfiles/mbp-m2-16gb/pi/* ~/.pi/agent/                      # replaces the Mac mini models/settings/MCP
mkdir -p ~/.lmstudio/.internal/user-concrete-model-default-config/LiquidAI
cp dotfiles/mbp-m2-16gb/lmstudio/LFM3-1.7B-MLX-4bit.json ~/.lmstudio/.internal/user-concrete-model-default-config/LiquidAI/
mkdir -p ~/.lmstudio/.internal/user-concrete-model-default-config/qwen
cp dotfiles/mbp-m2-16gb/lmstudio/qwen3.5-4b.json ~/.lmstudio/.internal/user-concrete-model-default-config/qwen/
```

Then open Qwen3.5-4B's settings in LM Studio (My Models → gear) and check that **Enable Thinking** is off.

Run `pi` in a project folder: LM Studio loads LFM3 on the first request. `/model` switches to Qwen3.5-4B, and
LM Studio unloads LFM3 first, because **Only Keep Last JIT Loaded Model** is on by default (Settings → Developer →
On-Demand Loading and Model TTL; the section shows once Developer Mode is on). Keep it on: both models loaded at once
push memory into the yellow.

## Settings

- **LFM3-1.7B**
  - Thinking is always on: Liquid says turning it off "can be inconsistent". `reasoning: true` shows it in pi.
    `supportsReasoningEffort: false`, as in Liquid's pi guide, so the thinking level has no effect.
  - Sampling: Liquid's values for tool use, agents and coding (temperature 0.1, top_k 50, repetition_penalty 1.1).
  - Context 65,536 tokens. Only 6 of the 24 layers keep the full history, so 64k of context costs about 0.8 GB.
  - MLX 4-bit on oMLX. LM Studio's standard MLX engine (mlx-llm) can't load the `lfm3` architecture.
    8-bit would be about 40 tokens/s: on this Mac speed follows the bytes read per token.
- **Qwen3.5-4B**
  - **Thinking off** in two places: `enableThinking: false` in the LM Studio file and `reasoning: false` in pi.
    Thinking costs hundreds of tokens before every tool call. Only the staff pick, not a Hugging Face download,
    has LM Studio's "Enable Thinking" switch.
  - Sampling: Qwen's non-thinking values (temperature 0.7, top_p 0.8, top_k 20, min_p 0, presence_penalty 1.5,
    repetition_penalty 1.0), all set, because LM Studio fills missing fields from its own chat presets.
  - Context 65,536 tokens: 32 KB per token, 2 GB at 64k.
- Both: **parallel sessions 1** in the LM Studio files (LM Studio reserves memory for 4 by default), and
  `supportsDeveloperRole: false` (neither chat template has a developer role).
- **Read-only tools** in `settings.json`: `defaultTools` removes `edit`, `write` and `bash` and adds `grep`, `find`
  and `ls`. bash goes too, because the model can write files with it. For one run with full access:
  `pi --tools +edit,+write,+bash`.
- `mcp.json`: Safari with `exposure: direct` and `autoEnableCodemode: false`. Codemode scripts can call every tool,
  `write` included, even when it's turned off, and a 4B model in a test sent 479 empty calls to it.
- `APPEND_SYSTEM.md`: find the code with grep first and read each file once; give each change as a file path plus one
  code block ready to paste (the whole file if it's short, otherwise the changed block with 2 lines around it, never a
  diff); change only what the task needs and never generated files such as `next-env.d.ts`; ask for the exact error
  instead of guessing; one step at a time; stop calling tools once the code is given. Each rule comes from a wrong
  answer in the test: a diff with the removed line missing, an unasked "fix" to `next-env.d.ts`, 59 file reads.
