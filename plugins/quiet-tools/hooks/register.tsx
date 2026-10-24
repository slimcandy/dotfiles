import type { Register } from 'claude-code'

// Nerd Font glyphs (Font Awesome range, present in every Nerd Font)
const ICON = {
  Bash: '\uf120',
  Read: '\uf15c',
  Edit: '\uf044',
  Write: '\uf0c7',
  NotebookEdit: '\uf044',
  Grep: '\uf002',
  Glob: '\uf002',
  WebFetch: '\uf0ac',
  WebSearch: '\uf00e',
  Agent: '\uf085',
  Skill: '\uf0e7',
  TodoWrite: '\uf0ae',
  mcp: '\uf1e6',
  other: '\uf013',
  error: '\uf00d',
} as const

type Input = Record<string, unknown>
type Patch = { lines: string[] }[]

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const firstLine = (s: string) => s.trim().split('\n')[0] ?? ''
const base = (path: string) => path.split('/').pop() || path
const host = (url: string) => url.replace(/^\w+:\/\//, '').split('/')[0]

function patchStats(patch: unknown): string {
  if (!Array.isArray(patch)) return ''
  let add = 0
  let del = 0
  for (const hunk of patch as Patch) {
    for (const line of hunk.lines ?? []) {
      if (line.startsWith('+')) add++
      else if (line.startsWith('-')) del++
    }
  }
  return add || del ? `+${add} −${del}` : ''
}

// What the row says: the model's own description where the tool has one, else built from the input.
function describe(tool: string, input: Input, output: unknown): { label: string; detail: string } {
  const out = (output ?? {}) as Input
  switch (tool) {
    case 'Bash':
      return { label: str(input.description) || firstLine(str(input.command)), detail: '' }
    case 'Read':
      return { label: `Read ${base(str(input.file_path))}`, detail: '' }
    case 'Edit':
      return { label: `Edit ${base(str(input.file_path))}`, detail: patchStats(out.structuredPatch) }
    case 'Write': {
      const created = out.type === 'create'
      const lines = str(input.content).split('\n').length
      return {
        label: `${created ? 'Create' : 'Write'} ${base(str(input.file_path))}`,
        detail: created ? `+${lines}` : patchStats(out.structuredPatch),
      }
    }
    case 'NotebookEdit':
      return { label: `Edit ${base(str(input.notebook_path))}`, detail: '' }
    case 'Grep':
      return { label: `Search "${str(input.pattern)}"`, detail: base(str(input.path)) }
    case 'Glob':
      return { label: `Find ${str(input.pattern)}`, detail: '' }
    case 'WebFetch':
      return { label: `Fetch ${host(str(input.url))}`, detail: '' }
    case 'WebSearch':
      return { label: `Search web: ${str(input.query)}`, detail: '' }
    case 'Agent':
      return { label: str(input.description) || 'Agent', detail: str(input.subagent_type) }
    case 'Skill':
      return { label: `Skill ${str(input.skill)}`, detail: '' }
    case 'TodoWrite':
      return { label: 'Update todos', detail: '' }
  }
  if (tool.startsWith('mcp__')) {
    const [, server = '', name = ''] = tool.split('__')
    return { label: `${server.replace(/^plugin_/, '')} · ${name}`, detail: '' }
  }
  return { label: tool, detail: '' }
}

function iconFor(tool: string): string {
  if (tool in ICON) return ICON[tool as keyof typeof ICON]
  return tool.startsWith('mcp__') ? ICON.mcp : ICON.other
}

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, Math.max(1, max - 1)) + '…' : s)

export const register: Register = on => {
  on('ui.render', { component: 'ToolUse' }, ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isExpanded) return next(e)

    const { tool, input, output, isRunning, isErrored, isInterrupted } = e.props
    const { label, detail } = describe(tool, (input ?? {}) as Input, output)
    const width = (e.viewport?.columns ?? 100) - 4
    const { Box, Text } = $.ui.resolve(e)

    const error = isErrored && !isInterrupted ? firstLine(typeof output === 'string' ? output : '') : ''

    return (
      <Box flexDirection="column">
        <Text>
          <Text color={isErrored && !isInterrupted ? 'red' : undefined} dimColor={isRunning}>
            {isErrored && !isInterrupted ? ICON.error : iconFor(tool)}
          </Text>{' '}
          <Text dimColor={isRunning} strikethrough={isInterrupted}>
            {clip(label, width - detail.length - 2)}
          </Text>
          {detail ? <Text dimColor>{'  ' + detail}</Text> : null}
        </Text>
        {error ? <Text color="red">{'  ' + clip(error, width - 2)}</Text> : null}
      </Box>
    )
  })

  // Results are hidden; ctrl+o (isExpanded) shows them as usual.
  on('ui.render', { component: 'ToolResult' }, ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isExpanded) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}
