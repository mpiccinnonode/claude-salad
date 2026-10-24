import type { Register } from 'claude-code'
import { runBuddy } from './commands.ts'
import type { Ctx } from './crew.ts'
import { reasonFor } from './lines.ts'
import { beat, clearDialogue, countTurnTogether, crewNow, hatchInto, nextSpeaker, quipFromModel, react, tickNow } from './state.ts'
import type { Live } from './state.ts'
import { drawBand } from './view.tsx'
import { HINT, WORDS } from './words.ts'

export const register: Register = (on, options) => {
  const o: Ctx = {
    // Still declared only because undeclared options never reach register: 0.8's overrides are carried into the buddies file once.
    old: { name: String(options.name ?? ''), personality: String(options.personality ?? ''), species: options.species && options.species !== 'auto' ? String(options.species) : undefined },
    active: String(options.active),
    file: String(options.buddiesFile || '~/.claude/buddy/buddies.json'),
    lang: options.language === 'en' ? 'en' : 'it',
    every: Math.max(1, Number(options.everyNTurns)),
    perEgg: Math.max(1, Number(options.turnsPerHatch)),
    perEvolve: Math.max(1, Number(options.turnsPerEvolve)),
    banterChance: Math.min(1, Math.max(0, Number(options.banterChance))),
    isRight: options.position === 'right',
    crewSize: Math.max(1, Math.floor(Number(options.crewSize))),
  }
  const w = WORDS[o.lang]
  // ponytail: the id only has to differ from other sessions' (and from this one before a hot reload), so no uuid
  const live: Live = { turns: 0, lastAnswer: '', lastCannedAt: -Infinity, lastActiveAt: 0, id: Math.random().toString(36).slice(2, 10), tally: { all: 0, by: {} }, isRefreshing: false }

  on('session.start', async ($, e, next) => {
    const crew = await hatchInto($, o)
    await $.command.register({ name: 'buddy', description: w.toggle(crew[0].name), argumentHint: HINT })
    // ponytail: band redraws ~3x/s forever; pause the ticker while hidden if that ever shows up in profiles
    live.lastActiveAt = await tickNow($)
    $.clock.every(300, () => beat($, o, live))
    return next(e)
  })

  // /clear ends the session without a new session.start: drop this conversation's dialogue.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      live.lastAnswer = ''
      live.turns = 0
      await clearDialogue($)
    }
    return next(e)
  })

  on('command.run', { command: 'buddy' }, async ($, e) => ({ text: await runBuddy($, o, e.args) }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const result = await next(e)
    const now = await tickNow($)
    live.lastActiveAt = now
    const reason = reasonFor(e.command, result.isError === true, new Date().getHours())
    // ponytail: one canned line per ~10s so a failing loop doesn't spam the bubble
    if (reason && now - live.lastCannedAt >= 33) {
      live.lastCannedAt = now
      await react($, o, reason, await crewNow($))
    }
    return result
  }).catch(($, e, next) => next(e)) // the reaction is cosmetic: if it throws, the Bash result it already had goes through

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // ponytail: main loop only, subagent turns would make it chatty
    if (e.agentId || e.reason !== 'answer') return result
    live.lastActiveAt = await tickNow($)
    live.lastAnswer = e.answer.slice(-1500)
    await countTurnTogether($, o, live)
    if (++live.turns % o.every !== 0) return result

    // The floor passes on each time; now and then the next one answers back, once, never a chain.
    const crew = await crewNow($)
    const i = await nextSpeaker($, crew)
    const said = await quipFromModel($, o, crew, i, `${w.turnDone}\n\n${live.lastAnswer}`)
    // ponytail: a turn costs 1 + banterChance Haiku calls on average; a reply already pending is not cancelled by the next turn
    if (said && crew.length > 1 && Math.random() < o.banterChance) $.clock.after(3000, () => quipFromModel($, o, crew, (i + 1) % crew.length, w.banter(crew[i]!.name, said)))
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => (await drawBand($, e, o, live)) ?? next(e))
}
