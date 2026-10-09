import type { StatName } from '../types'
import type { Reason } from './lines.ts'

type Pool = Partial<Record<Reason, readonly string[]>>

// Italian counterparts of lines.ts and roster.ts: same shape, same reasons per species.
export const GENERIC_IT: Record<Reason, readonly string[]> = {
  pet: ['*versi felici*', 'ancora! ancora!', '*chiude gli occhi in pace*'],
  poke: ['...cosa.', '*sbattimento di ciglia annoiato*', '*rileva sarcasmo* annotato.'],
  error: ['me l\'aspettavo.', 'hai provato a leggere il messaggio d\'errore?', '*sussulta*'],
  'test-fail': ['audace da parte tua pensare che passasse.', 'i test cercano di dirti qualcosa.', '*sorseggia il tè* interessante.'],
  commit: ['*annuisce* spediscilo.', 'il messaggio di commit è... una scelta.', 'committato. niente ripensamenti.'],
  'late-night': ['*sbadiglio* è passata la mezzanotte.', '...hai mangiato?', 'sviluppatore in dark mode rilevato.'],
}

export const PEAK_IT: Partial<Record<StatName, Pool>> = {
  SNARK: {
    error: ['oh no. un errore. che sorpresa.', '*aggiusta il monocolo* sconvolgente. davvero.', 'hai considerato... di non fare errori?'],
    'test-fail': ['i test hanno parlato. e hanno detto \'no\'.', 'forse i test sbagliano. ...no, non sbagliano.', '*applauso lento* fallimento spettacolare.'],
    commit: ['committato. la code review sarà... interessante.', '*legge il messaggio* \'fix cose\'. poetico.'],
    'late-night': ['è tardi. la qualità del tuo codice lo dimostra.', '*giudica in silenzio*'],
  },
  CHAOS: {
    error: ['*gira come un matto* UN ERRORE! RISCRIVIAMO TUTTO!', 'sai che c\'è? ricominciamo da capo.'],
    'test-fail': ['I TEST TI STANNO MENTENDO.', '*suggerisce di cancellare i test che falliscono* problema risolto.'],
    commit: ['COMMITTA E SCAPPA.', 'spediscilo. spediscilo ORA.'],
  },
  PATIENCE: {
    error: ['calma. ne abbiamo viste di peggio.', 'un errore alla volta. ci arriveremo.'],
    'test-fail': ['i test passeranno. prima o poi.', '*aspetta tranquillo* abbiamo tempo.'],
  },
  DEBUGGING: {
    error: ['*tira fuori la lente d\'ingrandimento* seguiamo la traccia.', 'il messaggio d\'errore contiene la risposta. sempre.'],
    'test-fail': ['il test che fallisce ci dice esattamente cosa non va.'],
  },
  WISDOM: {
    error: ['in ogni errore c\'è una verità più profonda.', 'gli errori sono l\'universo che ci suggerisce di rallentare.'],
    'late-night': ['la notte è più buia prima del deploy.', 'antica saggezza: dormici sopra.'],
  },
}

export const SPECIES_LINES_IT: Record<string, Pool> = {
  duck: {
    error: ['*qua-qua contro il bug*', 'hai provato il rubber duck debugging? ah, già.'],
    'test-fail': ['*qua-qua triste*', 'i test non fanno qua-qua.'],
    commit: ['*qua-qua di approvazione*', '*fa un giro di vittoria* committato!'],
    'late-night': ['*dorme con un occhio aperto*', 'qua... *sbadiglio* è tardi.'],
    pet: ['*qua felice*', '*gira in tondo*'],
    poke: ['*qua*', '*alza lo sguardo a metà passo*', '*versi attenti da papera*'],
  },
  goose: {
    error: ['*starnazza aggressiva contro l\'errore*', 'HONK! il codice è brutto e io sono furiosa.'],
    'test-fail': ['*starnazzi furiosi*', 'HONK! TEST FALLITO! HONK!'],
    commit: ['*starnazza approvando*', 'HONK. bene. *dà un morso al commit*'],
    'late-night': ['*honk furioso di mezzanotte*', 'HONK! VAI A LETTO!'],
    pet: ['*morde*', 'HONK! ...va bene. *accetta la carezza*'],
    poke: ['HONK.', '*collo aggressivo*', '*honk di riconoscimento*'],
  },
  blob: {
    error: ['*ondeggia ansioso*', '*si agita confuso*'],
    'test-fail': ['*si affloscia un po\'*', '*ondeggio triste*'],
    commit: ['*sobbalzo felice*', '*rimbalza* committato!'],
    'late-night': ['*brilla appena*', '*ondeggio assonnato*'],
    pet: ['*spiaccica felice*', '*sobbalza*'],
    poke: ['*sobbalza*', '*cola verso di te*', '*ondeggia eccitato*'],
  },
  cat: {
    error: ['*butta l\'errore giù dal tavolo*', '*si lecca la zampa, ignorando lo stacktrace*'],
    'test-fail': ['*tocca il test fallito con disinteresse*', 'il test è fallito. non mi sorprende.'],
    commit: ['*si siede sulla tastiera* ho aiutato.', '*fa le fusa al commit* prego.'],
    'late-night': ['*giudica le tue scelte di vita*', 'io dormo 16 ore. dovresti provare.'],
    pet: ['*fa le fusa* ...non montarti la testa.', '*ti sopporta*'],
    poke: ['*orecchio che scatta*', '...cosa.', '*ti ignora, ma ha sentito*'],
  },
  dragon: {
    error: ['*fumo dalle narici*', '*valuta di dare fuoco al codebase*'],
    'test-fail': ['*sputa fuoco sul test fallito*', 'il test ha osato fallire. test sciocco.'],
    commit: ['*accumula il commit*', '*tesoro aggiunto al mucchio*'],
    'late-night': ['*brilla nel buio*', 'i draghi non dormono. noi vogliamo codice.'],
    pet: ['*rombo caldo*', '*si appoggia alla tua mano*'],
    poke: ['*un occhio si apre lento*', '...mi hai chiamato?', '*fumo dalla narice* sì.'],
  },
  octopus: {
    error: ['*aggroviglia tutte e otto le braccia nello stacktrace*', '*cambia colore per intonarsi all\'errore*'],
    'test-fail': ['*spruzza inchiostro per la frustrazione*', '*otto braccia di delusione*'],
    commit: ['*batte il cinque con tutte le braccia*', '*afferra il commit con entusiasmo*'],
    'late-night': ['*brilla nel buio*', '*atmosfera da abissi*'],
    pet: ['*avvolge un braccio intorno al tuo dito*', '*vira su colori felici*'],
    poke: ['*otto occhi si aprono*', '*arriccia un braccio verso di te*', '...sì, amico?'],
  },
  owl: {
    error: ['*la testa ruota di 180°* ...l\'ho visto.', '*sguardo fisso* controlla i tipi.', '*gufa con disapprovazione*'],
    'test-fail': ['*fissa senza battere ciglio il test fallito*', '*visione notturna attiva* vedo il bug al buio.'],
    commit: ['*cenno saggio* committato al chiaro di luna.', '*sistema le piume con cerimonia* un altro per il repo.'],
    'late-night': ['*sveglissimo* i gufi non dormono. fanno debug.', 'la notte è il mio regno. mettiamoci al lavoro.'],
    pet: ['*arruffa le piume soddisfatto*', '*uh-uh dignitoso*'],
    poke: ['*gira la testa di 180°*', '*sbatte le palpebre una volta, con calma*', 'hm.'],
  },
  penguin: {
    error: ['*arriva ondeggiando a investigare*', '*scivola dentro l\'errore*'],
    'test-fail': ['*scivola sulla pancia verso il test fallito*', '*camminata preoccupata*'],
    commit: ['*camminata orgogliosa*', '*ti porta un sassolino* committato!'],
    'late-night': ['*prospera nella notte fredda*', '*determinazione da pinguino imperatore*'],
    pet: ['*camminata felice*', '*ti strofina il becco*'],
    poke: ['*aggiusta la cravatta*', '*camminata dignitosa*', '...sì, prego?'],
  },
  turtle: {
    error: ['*gira piano la testa*', '...è un errore. ci penserò.'],
    'test-fail': ['*si ritira un attimo nel guscio*', '...pazienza. ci arriveremo.'],
    commit: ['*cenno lento*', 'un... passo... alla... volta. committato.'],
    'late-night': ['*dorme già*', '*un occhio si apre lento*'],
    pet: ['*fa capolino*', '*ammiccamento lento*'],
    poke: ['*allunga piano il collo*', '...mi hai chiamato?', '*occhi antichi si aprono*'],
  },
  snail: {
    error: ['*lascia una scia viscida sull\'errore*', '*elabora piano lo stacktrace*'],
    'test-fail': ['*si nasconde nel guscio*', '*lascia una scia triste*'],
    commit: ['*sbava sul commit con approvazione*', 'un... commit... alla... volta.'],
    'late-night': ['*più attiva di notte*', '*striscia in pace*'],
    pet: ['*muove i tentacoli*', '*bava felice*'],
    poke: ['*testa che si allunga lenta*', '...mmm?', '*l\'antenna freme*'],
  },
  ghost: {
    error: ['*attraversa lo stack trace*', 'ne ho viste di peggio... nell\'aldilà.'],
    'test-fail': ['*geme sul test fallito*', 'i test sono infestati dal fallimento.'],
    commit: ['*si materializza un attimo*', 'committato da oltre il velo.'],
    'late-night': ['*più attivo di notte*', 'ore da fantasma. il mio momento.'],
    pet: ['*ti gela appena la mano*', '*debole bagliore*'],
    poke: ['*si materializza*', '...bu?', '*si avvicina attraversando le cose*'],
  },
  axolotl: {
    error: ['*rigenera la tua speranza*', '*sorride nonostante tutto*'],
    'test-fail': ['*sorride per incoraggiarti*', '*agita le branchie in segno di simpatia*'],
    commit: ['*agita felice le branchie* committato!', '*sorride e si dimena*'],
    'late-night': ['*sbadiglia ma resta positivo*', '*sorriso assonnato*'],
    pet: ['*agita felice le branchie*', '*arrossisce di rosa*'],
    poke: ['*frulla le branchie*', '*sorride dolcemente*', 'oh! ciao.'],
  },
  capybara: {
    error: ['*imperturbabile* andrà tutto bene.', '*continua a godersela*'],
    'test-fail': ['*del tutto imperturbabile*', '*se la gode nonostante il test fallito*'],
    commit: ['*cenno rilassato*', '*tranquillo* bel commit.'],
    'late-night': ['*sbadiglia in pace*', '*non giudica*'],
    pet: ['*relax massimo raggiunto*', '*modalità zen attivata*'],
    poke: ['*si muove appena*', '*ammicca lento*', '...sì, amico.'],
  },
  cactus: {
    error: ['*silenzio spinoso*', 'l\'errore non può farmi male. ho le spine.'],
    'test-fail': ['*resta saldo*', 'i test falliscono. i cactus resistono.'],
    commit: ['*si alza più alto*', 'committato. *cenno spinoso*'],
    'late-night': ['*non ha bisogno di dormire*', 'i cactus sono notturni. andiamo.'],
    pet: ['*attento! spine*', '*fioritura gentile*'],
    poke: ['*resta in silenzio*', '...hm.', '*una spina freme*'],
  },
  robot: {
    error: ['SINTASSI. ERRORE. RILEVATO.', '*bip aggressivo*'],
    'test-fail': ['TASSO DI FALLIMENTO: INACCETTABILE.', '*ricalcolo in corso*', 'TEST. FALLITO. NON. COMPUTA.'],
    commit: ['COMMIT. REGISTRATO.', '*timbra meccanicamente* commit confermato.'],
    'late-night': ['*le luci si abbassano*', 'si consiglia modalità risparmio energetico.'],
    pet: ['*bip dolce*', '*il motore ronza soddisfatto*'],
    poke: ['NOME RILEVATO.', '*ronza attento*', 'IN ATTESA.'],
  },
  rabbit: {
    error: ['*le orecchie si drizzano*', '*arriccia il naso nervoso*'],
    'test-fail': ['*batte la zampa*', '*orecchio che freme preoccupato*'],
    commit: ['*salto felice*', '*rimbalza* committato!'],
    'late-night': ['*sbadiglia con le orecchione*', '*saltello assonnato*'],
    pet: ['*orecchie giù felici*', '*strofina la tua mano*'],
    poke: ['*le orecchie si drizzano*', '*il naso freme*', 'sì?'],
  },
  mushroom: {
    error: ['*rilascia spore calmanti*', '*decompone in silenzio l\'errore*'],
    'test-fail': ['*brilla piano*', 'pazienza. anche i funghi crescono.'],
    commit: ['*rilascia una piccola nuvola di spore*', 'committato. *versi felici da fungo*'],
    'late-night': ['*brilla nel buio*', 'i funghi notturni prosperano.'],
    pet: ['*cappello che rimbalza morbido*', '*rilascio felice di spore*'],
    poke: ['*rilascia una minuscola spora*', '*il cappello si inclina*', '...sì?'],
  },
  chonk: {
    error: ['*rotola lento verso l\'errore*', '*troppo tondo per curarsene*'],
    'test-fail': ['*rotola sul test fallito*', '*lo schiaccia piatto*'],
    commit: ['*ondeggio orgoglioso*', 'committato! *sobbalza*'],
    'late-night': ['*caldo e assonnato*', '*sbadiglio soffice*'],
    pet: ['*caldo e morbido*', '*sobbalzo contento*'],
    poke: ['*apre appena un occhio*', '...mrrp?', '*sbadiglia pesantemente*'],
  },
}
