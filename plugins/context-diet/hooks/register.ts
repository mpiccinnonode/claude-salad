import type { Register } from 'claude-code'
import { dropSkills, parseList, stripGatekeeper } from './diet.ts'

export const register: Register = (on, options) => {
  const drop = parseList(String(options.dropSkills ?? ''))

  on('prompt.attachment', { type: 'skill_listing' }, ($, e, next) =>
    drop.size ? next({ ...e, text: dropSkills(e.text, drop) }) : next(e),
  )

  on('prompt.attachment', ($, e, next) =>
    options.stripGatekeeper && e.origin.kind === 'hook' && e.origin.event === 'SessionStart'
      ? next({ ...e, text: stripGatekeeper(e.text) })
      : next(e),
  )
}
