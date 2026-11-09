/**
 * Sounds, same as the Claude Code setup (dotfiles kit plugin):
 * Hero when pi finishes and waits for input, Blow when it asks you a question.
 * Interactive sessions only, so scripted `pi -p` runs stay quiet.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";

const play = (name: string) =>
	spawn("afplay", [`/System/Library/Sounds/${name}.aiff`], { detached: true, stdio: "ignore" }).unref();

export default function (pi: ExtensionAPI) {
	// agent_end can be followed by retries or compaction; agent_settled means really idle
	pi.on("agent_settled", async (_event, ctx) => {
		if (ctx.hasUI) play("Hero");
	});
	pi.on("tool_call", async (event, ctx) => {
		if (ctx.hasUI && event.toolName === "questionnaire") play("Blow");
	});
}
