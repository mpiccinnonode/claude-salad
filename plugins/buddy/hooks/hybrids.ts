import type { Rig } from './rhythms.ts'
import { BATCH as B01 } from './hybrids/01.ts'
import { BATCH as B02 } from './hybrids/02.ts'
import { BATCH as B03 } from './hybrids/03.ts'
import { BATCH as B04 } from './hybrids/04.ts'
import { BATCH as B05 } from './hybrids/05.ts'
import { BATCH as B06 } from './hybrids/06.ts'
import { BATCH as B07 } from './hybrids/07.ts'
import { BATCH as B08 } from './hybrids/08.ts'
import { BATCH as B09 } from './hybrids/09.ts'
import { BATCH as B10 } from './hybrids/10.ts'

// Hand-drawn rigs for the children of two species, keyed by `hybridOf` (bones.ts); a batch per file under hybrids/.
export const HYBRIDS: Record<string, Rig> = { ...B01, ...B02, ...B03, ...B04, ...B05, ...B06, ...B07, ...B08, ...B09, ...B10 }
