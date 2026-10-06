const GATEKEEPER = /<EXTREMELY_IMPORTANT>\s*You have superpowers\.[\s\S]*?<\/EXTREMELY_IMPORTANT>\s*/g
const ENTRY = /^- ([\w.-]+(?::[\w.-]+)?)(?::\s|$)/

export const stripGatekeeper = (text: string) => text.replace(GATEKEEPER, '')

// An entry runs from its "- name:" line until the next one, so multi-line descriptions go with it.
export function dropSkills(text: string, drop: ReadonlySet<string>) {
  let keep = true
  return text
    .split('\n')
    .filter(line => {
      const m = ENTRY.exec(line)
      if (m?.[1]) keep = !drop.has(m[1])
      return keep
    })
    .join('\n')
}

export const parseList = (csv: string) =>
  new Set(csv.split(',').map(s => s.trim()).filter(Boolean))
