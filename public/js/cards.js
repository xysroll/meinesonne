// cards.js — Cathedral taxonomy card system
// Usage: type !strawman, !adhom, !cb, etc. in chat to post a glossary card
(function () {
  'use strict';

  // ── Alias map ────────────────────────────────────────────────────────────
  // Rules:
  //   • All aliases are lowercase, no spaces, no hyphens
  //   • No alias appears in more than one entry
  //   • Acronyms that could conflict are scoped (e.g. bw = blackwhite only, not bandwagon)
  //   • Common misspellings and cultural variants included

  var ALIASES = {

    // ── FALLACIES ────────────────────────────────────────────────────────

    f_ad_hominem: [
      'adhominem', 'adhom', 'adh',
      'personalattack', 'attackingtheperson', 'attackperson',
      'characterattack', 'namecalling',
      'abusive', 'circumstantial',
      'whataboutism',             // common variant / related
      'tuquoque', 'tuquoq',       // latin name
    ],

    f_ad_populum: [
      'adpopulum', 'adpop',
      'bandwagon', 'bandwagoneffect',
      'popularopinion', 'popularity', 'popularvote',
      'majoritybelieve', 'majorityrules',
      'appealtopeople', 'appealthemasses',
      'mob', 'mobmentality',
      'trending', 'viral',
    ],

    f_appeal_fear: [
      'appealfear', 'appealtofear', 'atf',
      'fearmongering', 'fearmonger',
      'scaretactic', 'scaretactics',
      'threaten', 'threat',
      'ifnotthis',
    ],

    f_appeal_emotion: [
      'appealemotion', 'appealtoemotion', 'ate',
      'emotionalappeal', 'emotional', 'emotion',
      'pathos',
      'pityplea', 'appealtopity', 'pity',
      'manipulativeemotion',
    ],

    f_appeal_authority: [
      'appealauthority', 'appealtoauthority', 'ata',
      'authority', 'authorityfallacy',
      'expertopinion', 'expertfallacy',
      'appealtocelebrity', 'celebrity',
      'argumantumadverecundiam', 'verecundiam',
      'namedroppingfallacy',
    ],

    f_appeal_tradition: [
      'appealtradition', 'appealtotradition', 'att',
      'tradition', 'traditional',
      'oldways', 'alwaysdone',
      'argumantumadantiquitatem', 'antiquitatem',
      'historicalfallacy',
      'ifdontfix', 'ifitaintbroke',
    ],

    f_appeal_novelty: [
      'appealnovelty', 'appealtonovelty', 'atn2',  // atn2 to avoid conflict with appealtonature
      'novelty', 'noveltyfallacy',
      'newisbetter', 'newisgood',
      'argumantumadnovitatem', 'novitatem',
      'modernisbetter', 'progressive',
    ],

    f_appeal_ignorance: [
      'appealignorance', 'appealtoignorance', 'ati',
      'ignorance', 'ignorancefallacy',
      'absenceofproof', 'proofofabsence',
      'argumantumadignnorantiam', 'adignnorantiam',
      'notproven', 'cantdisprove',
      'lackofevidenceisproof',
    ],

    f_appeal_nature: [
      'appealnature', 'appealtonature', 'atn',
      'natural', 'naturalistic', 'naturalisticfallacy',
      'naturalmeansgood', 'naturalisbetter',
      'unnatural', 'artificial',
      'goodnaturalbadartificial',
      'chemicalsarebad', 'organic',        // everyday version
    ],

    f_equivocation: [
      'equivocation', 'equivoc', 'equiv',
      'doublemeaning', 'wordplay',
      'ambiguity', 'ambiguous',
      'shifitingmeaning', 'wordswitch',
      'semanticfallacy',
    ],

    f_post_hoc: [
      'posthoc', 'hoc', 'ph',
      'postergopropterhoc', 'propter',
      'afterthis', 'afterthisbecausethis',
      'temporalcausation', 'sequencecausation',
      'becauseafter', 'followedby',
      'falsecause',                        // shared label but distinct from cum hoc
    ],

    f_cum_hoc: [
      'cumhoc', 'ch',
      'correlation', 'correlationcausation',
      'spuriouscorrelation', 'spurious',
      'correlationisnotcausation', 'corrnotcause',
      'simultaneouscause', 'cooccurrence',
    ],

    f_false_dilemma: [
      'falsedilemma', 'fd',
      'blackwhite', 'blackandwhite', 'bw',
      'eitheror', 'eitheroror',
      'falsedichotomy', 'dichotomy',
      'bifurcation', 'bifurcationfallacy',
      'falsedualism',
      'youreeitherwithusor',
    ],

    f_loaded_q: [
      'loadedquestion', 'lq',
      'complexquestion', 'trickquestion',
      'guiltyquestion', 'presupposition',
      'loadedq', 'chargedquestion',
      'embeddedassumption',
    ],

    f_begging_q: [
      'begging', 'beggingthequestion', 'btq',
      'circularreasoning', 'circular', 'circle',
      'petitionprincipi', 'petitioprincipi',
      'circularargunment', 'selfproving',
      'assumingconclusion',
    ],

    f_slippery_slope: [
      'slipperyslope', 'slippery', 'slope', 'ss',
      'dominoeffect', 'domino',
      'chainreaction', 'chain',
      'ifweallowthis', 'theneverything',
      'cameledge', 'wedge',               // "camel's nose" / wedge argument
      'leadsto',
    ],

    f_strawman: [
      'strawman', 'straw', 'sm',
      'strawmanning',
      'scarecrow',                         // UK/Australian variant
      'misrepresentation', 'misrepresent',
      'distortion', 'distort',
      'knockdownargument',
    ],

    f_cherry_picking: [
      'cherrypicking', 'cherry', 'cp',
      'cherrypick',
      'selectiveevidence', 'biasedevidence',
      'texassharpshooter', 'texas',        // very well known variant
      'ignoringcounterexamples',
      'selecteddata', 'selectivedata',
      'confirmatorysampling',
    ],

    f_red_herring: [
      'redherring', 'herring', 'rh',
      'distraction', 'deflection',
      'changingsubject', 'changesubject',
      'smokescreen',                       // common synonym
      'irrelevant', 'irrelevance',
      'sidetrack',
    ],

    f_shifting_burden: [
      'shiftingburden', 'shiftburden', 'sb',
      'burdenofproof', 'burden',
      'proveit', 'provemedwrong',
      'onus', 'onereversal',
      'probandum',
    ],

    f_consequent: [
      'affirmingconsequent', 'affirmconsequent', 'ac',
      'consequent', 'affirming',
      'reversingimplication', 'reverseif',
      'confusingsufficiency',
    ],

    f_antecedent: [
      'denyingantecedent', 'denyantecedent', 'da',
      'antecedent', 'denying',
      'negatingantecedent',
      'confusingnecessity',
    ],

    // ── BIASES ────────────────────────────────────────────────────────────

    b_confirmation: [
      'confirmationbias', 'confirmation', 'cb',
      'myopicresearch', 'seekingconfirmation',
      'beliefinertia',
      'myside', 'mysidebias',
    ],

    b_anchoring: [
      'anchoringbias', 'anchoring', 'anchor',
      'firstnumber', 'initialnumber',
      'pricinganchor', 'anchoreffect',
      'focalism',
    ],

    b_sunk_cost: [
      'sunkcost', 'sunk', 'sc',
      'sunkcoatfallacy',
      'concorde', 'concordefallacy',       // famous real-world example
      'throwgoodmoney', 'escalationcommitment',
      'ivesttoomuch',
    ],

    b_dunning_kruger: [
      'dunningkruger', 'dunning', 'kruger', 'dk',
      'dkeffect', 'dunningkrugereffect',
      'overconfidence', 'overconfident',
      'unskilled', 'incompetent',
      'metacognition', 'metacognitive',
      'knowsnothing', 'iknoweverything',
    ],

    b_availability: [
      'availabilityheuristic', 'availability', 'ah',
      'availabilitybias',
      'recency', 'recencybias',
      'mediabias',                         // common everyday form
      'vividmemory', 'easytorecall',
      'whatcomestomind',
    ],

    b_halo: [
      'haloeffect', 'halo', 'he',
      'positivehaalo',
      'attractiveness', 'attractivenessbias',
      'firstimpressionbias',
    ],

    b_horn: [
      'horneffect', 'horn',
      'negativehalo', 'reversehaalo',
      'devilshorn',
      'onenegativetrait',
    ],

    b_framing: [
      'framingeffect', 'framing', 'fe',
      'howitsaid', 'presentation',
      'spineffect',
      'lossframe', 'gainframe',
      'wordingmatters',
    ],

    b_loss_aversion: [
      'lossaversion', 'loss', 'la',
      'fearofloss', 'avoidingloss',
      'losslooms', 'painfulloss',
      'riskavoidance',
    ],

    b_hindsight: [
      'hindsightbias', 'hindsight', 'hb',
      'iknewitallalong', 'iknewit',
      'mondaymorningquarterback',          // American idiom
      'knowitall', 'predictable',
      'obviouslythis',
    ],

    b_gamblers_fallacy: [
      'gamblersfallacy', 'gambler', 'gamblers', 'gf',
      'hothand', 'hothandfallacy',
      'montecarlo', 'montecarloeffect',
      'dueforwin', 'coindue',
      'luckystreak',
    ],

    b_false_consensus: [
      'falseconsensus', 'fc',
      'falseconsensuseffect',
      'everyonethinks', 'mostpeoplebelieve',
      'consensusbias', 'assumedconsensus',
    ],

    b_fundamental_attr: [
      'fundamentalattribution', 'fundamentalerror', 'fae',
      'attributionerror', 'attribution',
      'personalityfallacy',
      'dispositionalbias',
      'blametheperson', 'blamingcharacter',
    ],

    b_self_serving: [
      'selfserving', 'selfservingbias', 'ssb',
      'selfserv', 'mysuccessyourfailure',
      'creditshifting', 'blameothers',
      'selfattribution',
    ],

    b_optimism: [
      'optimismbias', 'optimism', 'ob',
      'unrealisticoptimism',
      'rosytinted', 'rosyoutlook',
      'itwontaffectme', 'wontbeme',
      'overlyoptimistic',
    ],

    b_illusory_super: [
      'illusorysuperiority', 'illusorysuper', 'is',
      'lakewobegon', 'lakewobegoneffect',
      'aboveaverage', 'aboveaveragebias',
      'overratingself', 'betterthanaverage',
      'superiorityillusion',
    ],

    b_blind_spot: [
      'biasblindspot', 'blindspot', 'bbs',
      'biasinothers', 'iseemybias',
      'immunetobias',
      'notmebias',
    ],

    b_ingroup: [
      'ingroupbias', 'ingroup', 'igb',
      'tribalism', 'tribe',
      'favoringowngroup', 'owngroup',
      'wevsthem',
      'ingrouppref',
    ],

    b_backfire: [
      'backfireeffect', 'backfire', 'be',
      'beliefstrengthen', 'backfiresoncorrection',
      'correctionresistance',
      'doubledown',
    ],

    b_illusory_truth: [
      'illusorytruth', 'illusionoftruth', 'it',
      'repeatedlie', 'repeatalie',
      'repetitioneffect', 'repetition',
      'repeatedexposure', 'exposureeffect',
      'propagandaeffect',
    ],

    b_spotlight: [
      'spotlighteffect', 'spotlight', 'se',
      'selfconsciousness',
      'everyoneisnoticing', 'everyonelooking',
      'centerstage', 'allonme',
    ],

    b_conjunction: [
      'conjunctionfallacy', 'conjunction', 'cf',
      'lindaproblem', 'linda',
      'moredescriptivemorlikely',
      'specificitybias',
      'representativenessfallacy',
    ],

    b_projection: [
      'projectionbias', 'projection',
      'projectingfeelings', 'projecting',
      'assumingyouthinklikeme',
      'othersarlikeme',
    ],

    b_cog_dissonance: [
      'cognitivedissonance', 'dissonance', 'cd',
      'contradictorybeliefs', 'rationalization',
      'rationalizing', 'conflictingbeliefs',
      'mentalconflict',
    ],

    b_hyperbolic_disc: [
      'hyperbolicdiscounting', 'hyperbolic', 'hd',
      'presentbias', 'nowvslater',
      'immediategratification', 'nowvslater',
      'delaydiscounting', 'futurediscounting',
      'impatience',
    ],

    b_endowment: [
      'endowmenteffect', 'endowment', 'ee',
      'ownership', 'ownershipbias',
      'itsmineiloveit', 'possessionbias',
      'willingnesstoaccept',
    ],

    b_regression_ignore: [
      'regressiontomean', 'regression', 'rtm',
      'regressionmean', 'meantregression',
      'extremesreturn', 'regresstoaverage',
      'naturalmeanshift',
    ],

    b_actor_observer: [
      'actorobserver', 'actorbias', 'aob',
      'actorobservererasoning',
      'mysituationyourcharacter',
      'selfvs others',
    ],

    b_representativeness: [
      'representativeness', 'repr', 'reph',
      'representativenessheuristic',
      'stereotype', 'stereotyping',
      'baserate', 'baserateIgnoring',
      'typicality', 'seemstypical',
      'profilebias',
    ],

    b_illusory_corr: [
      'illusorycorrelation', 'illusorycorr', 'ic',
      'falsecorrelation', 'imaginarycorrelation',
      'seeingpatterns', 'patternbias',
      'unrelatedevents',
    ],

    b_self_fulfilling: [
      'selffulfilling', 'selffulfilllingprophecy', 'sfp',
      'pygmalion', 'pygmalioneffect',      // well known in education
      'rosenthal', 'rosenthaleffect',      // researcher who named it
      'expectationeffect', 'expectations',
      'makeitso',
    ],

    b_belief_bias: [
      'beliefbias', 'bb',
      'conclusiondriven', 'conclusionbias',
      'acceptbecauseibelieve',
      'logicvbelief',
    ],

    b_inattentional: [
      'inattentionalblindness', 'inattentional', 'ib',
      'invisiblegorilla', 'gorilla',       // the famous experiment
      'notnoticing', 'missingobvious',
      'focusblindness',
    ],

    b_change_blindness: [
      'changeblindness', 'changebias', 'cbb',
      'missedchange', 'notdetectingchange',
      'visualchange',
    ],

    b_google_effect: [
      'googleeffect', 'digitalmemory', 'ge',
      'cyberforgetfulness', 'digitalamnesia',
      'offloadingmemory', 'outlsourcingmemory',
      'googledependence',
    ],

    b_consistency: [
      'consistencybias', 'consistency', 'consbias',
      'memoryconsistency', 'revisedmemory',
      'rememberingasalways',
    ],

    b_telescoping: [
      'telescopingeffect', 'telescoping', 'tel',
      'timeperceiption', 'distortedtime',
      'recencydistortion',
    ],

    b_cryptomnesia: [
      'cryptomnesia', 'cryptomn', 'crm',
      'forgottenidea', 'forgottenmemory',
      'inadvertentplagiarism', 'accidentalplagiarism',
      'georgeharrison',                    // famous case
    ],

    // ── ASSUMPTION ───────────────────────────────────────────────────────

    assumption: [
      'assumption', 'assume', 'assuming',
      'hiddenassumption', 'hiddenpremise',
      'unstated', 'unstatedpremise',
      'impliedpremise', 'impliedassumption',
      'takesforgranted', 'unspoken',
      'premise',
    ],
  };

  // ── Normalize input ──────────────────────────────────────────────────────
  function normalize(str) {
    return str.toLowerCase().replace(/[\s\-_.']/g, '');
  }

  // ── Build reverse lookup once ────────────────────────────────────────────
  var LOOKUP = {};
  Object.entries(ALIASES).forEach(function (kv) {
    var id = kv[0], aliases = kv[1];
    aliases.forEach(function (alias) {
      if (LOOKUP[alias]) {
        console.warn('[cards] Duplicate alias "' + alias + '" in ' + id + ' and ' + LOOKUP[alias]);
      }
      LOOKUP[alias] = id;
    });
  });

  // ── Match query to taxonomy id ───────────────────────────────────────────
  function match(raw) {
    var q = normalize(raw);
    if (!q) return null;

    // 1. Exact match
    if (LOOKUP[q]) return LOOKUP[q];

    // 2. Starts-with — find shortest alias that starts with q
    var swMatches = Object.keys(LOOKUP).filter(function (a) { return a.startsWith(q); });
    if (swMatches.length === 1) return LOOKUP[swMatches[0]];
    if (swMatches.length > 1) {
      // Pick the shortest alias — most specific match
      swMatches.sort(function (a, b) { return a.length - b.length; });
      // Only return if top match is unambiguous (all map to same id)
      var topId = LOOKUP[swMatches[0]];
      var allSame = swMatches.every(function (a) { return LOOKUP[a] === topId; });
      if (allSame) return topId;
    }

    // 3. Contains
    var cMatches = Object.keys(LOOKUP).filter(function (a) { return a.includes(q); });
    if (cMatches.length === 1) return LOOKUP[cMatches[0]];
    if (cMatches.length > 1) {
      cMatches.sort(function (a, b) { return a.length - b.length; });
      var cTopId = LOOKUP[cMatches[0]];
      var cAllSame = cMatches.every(function (a) { return LOOKUP[a] === cTopId; });
      if (cAllSame) return cTopId;
    }

    return null;
  }

  // ── Expose matcher and aliases globally ──────────────────────────────────
  window.CardMatcher = { match: match, normalize: normalize };
  window.CardAliases = ALIASES;

  // ── Get item from taxonomy ────────────────────────────────────────────────
  function getItem(id) {
    var all = Object.values(window.TAXONOMY).flat();
    return all.find(function (it) { return it.id === id; }) || null;
  }

  function groupPillClass(group) {
    if (group === 'Fallacy') return 'pill-fallacy';
    if (group === 'Bias') return 'pill-bias';
    if (group === 'Assumption') return 'pill-assumption';
    return '';
  }

  // ── Render a taxonomy card into the messages container ───────────────────
  window.renderTaxonomyCard = function (data) {
    var item = getItem(data.id);
    if (!item) return;

    var messages = document.getElementById('messages');
    if (!messages) return;

    var empty = document.getElementById('empty-state');
    if (empty) empty.style.display = 'none';

    var card = document.createElement('div');
    var groupClass = 'tc-' + item.group.toLowerCase();
    card.className = 'taxonomy-card slide-in ' + groupClass;
    card.dataset.id = item.id;

    card.innerHTML =
      '<div class="tc-body">' +
      '<div class="tc-top">' +
      '<span class="tc-pill ' + groupPillClass(item.group) + '">' + item.group + '</span>' +
      '<span class="tc-name">' + escHtml(item.name) + '</span>' +
      '<span class="tc-byline">' + escHtml(data.triggeredBy) + '</span>' +
      '<span class="tc-hint">explore →</span>' +
      '</div>' +
      '<p class="tc-def">' + escHtml(item.def) + '</p>' +
      '</div>';

    // Click → open glossary panel at this item
    card.addEventListener('click', function () {
      var panel = document.getElementById('taxonomy-panel');
      if (!panel) return;

      // Open panel if closed
      if (!panel.classList.contains('tax-open')) {
        var btn = document.getElementById('tax-toggle-btn');
        if (btn) btn.click();
      }

      // Wait for panel to open, then navigate to item
      setTimeout(function () {
        if (window.TaxonomyPanel && window.TaxonomyPanel.showItem) {
          window.TaxonomyPanel.showItem(item);
        }
      }, panel.classList.contains('tax-open') ? 0 : 280);
    });

    messages.appendChild(card);
    messages.scrollTop = messages.scrollHeight;
  };

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();