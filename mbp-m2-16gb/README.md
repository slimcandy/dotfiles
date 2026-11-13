# pi on the MacBook Pro M2, 16 GB

The 13" MacBook Pro (2022, base M2, 100 GB/s memory bandwidth) can't hold the Mac mini's Qwen3.6-35B-A3B.
Here pi runs as a full coding agent (read, write, edit, bash) on one of two small models in LM Studio:

| Model | In pi | Build | Size | Speed on the M2 | Memory during `next build` |
|---|---|---|---|---|---|
| [LFM3-1.7B](https://huggingface.co/LiquidAI/LFM3-1.7B) | default | [LiquidAI/LFM3-1.7B-MLX-4bit](https://huggingface.co/LiquidAI/LFM3-1.7B-MLX-4bit) | 1 GB | ~70 tokens/s | ~10 GB |
| [Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B) | fallback | LM Studio's staff pick `qwen/qwen3.5-4b`, MLX 4-bit | 3 GB | ~30 tokens/s | ~13 GB |

Speed and memory were measured on the Mac mini and scaled to the M2's memory bandwidth. Memory is the whole Mac:
about 5 GB for macOS, 1.5 GB for LM Studio, then the model, its context and the build.

## What to expect

Give it small tasks. Neither model builds a whole site from one long spec in under 30 minutes.

In a test of five small tasks on a finished Next.js site, one run each, both models changed text across two files
and fixed a type error in 1–3 minutes. LFM3 also added an FAQ section (5–6 minutes) but couldn't restore one
missing `</div>` or add a region filter with state. Qwen3.5-4B did those two (3 and 10 minutes) but not the FAQ.
3 of 5 against 4 of 5 is within the noise of one run. Qwen3.5-4B had thinking on in that test; this config turns
it off for speed.

LFM3 is the default: the same results at twice the speed and with 3 GB less memory. Liquid post-trained it for agent
harnesses, pi among them, though its model card says it's "not recommended for agentic coding or complex multi-step
reasoning due to its small size". When it gets stuck on logic, switch to Qwen3.5-4B with `/model`.

Keep projects in folders without spaces in the path: small models write paths unquoted in shell commands and end up
writing to another folder.

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
- `mcp.json`: Safari with `exposure: direct` and `autoEnableCodemode: false`. With codemode on, a 4B model in the
  test sent 479 empty calls to its script tool instead of editing files.
- `APPEND_SYSTEM.md`: six rules, each from a failure in the test: stay in the project folder and quote paths, run
  `npm install` before the build, change only the broken line, read the file again after a failed edit, one change
  at a time, stop and list the changes. With them LFM3 solved the same 3 of 5 tasks: they keep it in the project
  folder but don't fix its reasoning.
