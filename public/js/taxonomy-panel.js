// taxonomy-panel.js — Cathedral Glossary Panel
(function () {
  'use strict';

  var PANEL_KEY = 'taxonomy-panel-open';
  var PANEL_W = 240;
  var PANEL_GAP = 8;

  function getZoom() {
    return parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  }

  function positionPanel() {
    var panel = document.getElementById('taxonomy-panel');
    if (!panel) return;
    // Allow positioning even before tax-open is set (called pre-show)
    var inner = document.getElementById('chat-screen-inner');
    if (!inner) return;
    var z = getZoom();
    var r = inner.getBoundingClientRect();
    var vw = window.innerWidth / z;
    var right = r.right / z;
    var top = r.top / z;
    var height = r.height / z;

    var rightAvail = vw - right - PANEL_GAP * 2;

    if (rightAvail < PANEL_W) {
      panel.style.opacity = '0';
      panel.style.pointerEvents = 'none';
      return;
    }

    var panelH = Math.round(height * 0.82);
    var panelTop = top + PANEL_GAP + Math.round((height - panelH) / 2);
    var panelLeft = right + PANEL_GAP + Math.round((rightAvail - PANEL_W) / 2);

    panel.style.left = panelLeft + 'px';
    panel.style.top = panelTop + 'px';
    panel.style.width = PANEL_W + 'px';
    panel.style.height = panelH + 'px';
    panel.style.right = 'auto';
    panel.style.opacity = '1';
    panel.style.pointerEvents = 'all';
    if (window.positionLayoutSwitcher) window.positionLayoutSwitcher();
  }

  var ENTRY_DETAIL = {
    f_consequent: { example: '"If it rains, the streets are wet. The streets are wet, so it must have rained." Ignores other causes — a street cleaner, a burst pipe, etc.', howToDetect: 'Look for: "If A then B. B is true, therefore A is true." The mistake is treating a sufficient condition as a necessary one.', whereCommon: 'Medical diagnosis, security systems, legal reasoning.', severity: 'High', frequency: 'Very Common' },
    f_antecedent: { example: '"If you study hard, you\'ll pass. You didn\'t study hard, so you won\'t pass." Fails to account for other paths to passing.', howToDetect: 'Spot: "If A then B. Not A, therefore not B." The error is assuming A is the only way to reach B.', whereCommon: 'Academic contexts, motivation speeches, policy debates.', severity: 'Medium', frequency: 'Common' },
    f_ad_hominem: { example: '"We shouldn\'t take Dr. Smith\'s climate research seriously — she\'s been divorced twice."', howToDetect: 'The argument pivots from the idea to the person. Ask: does the personal detail affect the argument\'s logic?', whereCommon: 'Politics, online debates, courtrooms, social media.', severity: 'High', frequency: 'Extremely Common' },
    f_ad_populum: { example: '"Nine out of ten people believe this supplement works, so it must be effective."', howToDetect: 'Watch for appeals to majority opinion as the primary justification without citing why the majority would know.', whereCommon: 'Advertising, politics, social trends, product reviews.', severity: 'Medium', frequency: 'Extremely Common' },
    f_appeal_fear: { example: '"If you don\'t vote for us, crime will explode and your family will be unsafe."', howToDetect: 'The speaker introduces a threatening scenario then offers themselves as the solution — without logical connection.', whereCommon: 'Political campaigns, insurance sales, security industry marketing.', severity: 'High', frequency: 'Very Common' },
    f_appeal_emotion: { example: '"Think of the children! How can you support this policy knowing they\'ll suffer?"', howToDetect: 'Emotional language bypasses critical evaluation. Look for vivid imagery and appeals to pity without factual support.', whereCommon: 'Advertising, charity fundraising, political speeches, tabloid media.', severity: 'Medium', frequency: 'Extremely Common' },
    f_appeal_authority: { example: '"A famous actor says this diet works, so it must be healthy."', howToDetect: 'Ask: is the authority actually an expert in this domain? An authority in one field is a layperson in another.', whereCommon: 'Advertising, health claims, political endorsements.', severity: 'Medium', frequency: 'Extremely Common' },
    f_appeal_tradition: { example: '"We\'ve always done hiring this way — why would we change now?"', howToDetect: 'The argument is: "X is old/traditional, therefore X is good." Age and longevity are not indicators of correctness.', whereCommon: 'Corporate culture, religious debates, policy discussions.', severity: 'Medium', frequency: 'Very Common' },
    f_appeal_novelty: { example: '"This blockchain solution is brand new — it must be better than legacy systems."', howToDetect: 'Novelty is treated as inherently superior. Newness is not evidence of quality.', whereCommon: 'Tech industry, fashion, startup culture, product launches.', severity: 'Low', frequency: 'Common' },
    f_appeal_ignorance: { example: '"No one has proved that ghosts don\'t exist, so they must be real."', howToDetect: 'The argument concludes truth from absence of disproof. The burden of proof is misplaced.', whereCommon: 'Conspiracy theories, pseudoscience, legal contexts.', severity: 'High', frequency: 'Very Common' },
    f_equivocation: { example: '"The sign said \'fine for parking here,\' so I thought it was fine to park there."', howToDetect: 'A word shifts meaning mid-argument. Check whether key terms carry the same definition throughout.', whereCommon: 'Legal texts, political slogans, philosophical debates.', severity: 'High', frequency: 'Common' },
    f_post_hoc: { example: '"I wore my lucky socks and we won the game, so the socks caused the win."', howToDetect: 'Look for: "B happened after A, therefore A caused B." Sequence alone is not causation.', whereCommon: 'Superstition, policy evaluation, medical anecdotes, sports.', severity: 'High', frequency: 'Very Common' },
    f_cum_hoc: { example: '"Ice cream sales and drowning rates both spike in summer — ice cream causes drowning."', howToDetect: 'Two variables co-occur and causation is inferred. Look for a hidden third variable (confound) driving both.', whereCommon: 'Statistical reporting, science journalism, public health debates.', severity: 'High', frequency: 'Very Common' },
    f_false_dilemma: { example: '"You\'re either with us or against us."', howToDetect: 'Count the options presented. Are there really only two? Is the either/or framing excluding middle ground or alternatives?', whereCommon: 'Politics, negotiation, marketing, conflict situations.', severity: 'High', frequency: 'Extremely Common' },
    f_loaded_q: { example: '"Have you stopped beating your dog?" (Both yes and no imply you once did.)', howToDetect: 'The question contains an embedded assumption never established. Answering it forces acceptance of that assumption.', whereCommon: 'Political interviews, courtroom cross-examination, surveys.', severity: 'High', frequency: 'Common' },
    f_begging_q: { example: '"The Bible is true because it says so in the Bible."', howToDetect: 'The conclusion is smuggled into the premise. Restate the argument without the conclusion — if it collapses, it was circular.', whereCommon: 'Religious arguments, political ideology, brand loyalty claims.', severity: 'Medium', frequency: 'Common' },
    f_slippery_slope: { example: '"If we allow same-sex marriage, next people will want to marry animals."', howToDetect: 'A chain of increasingly extreme consequences is presented without evidence each step follows.', whereCommon: 'Drug policy, gun control debates, social policy arguments.', severity: 'Medium', frequency: 'Very Common' },
    f_strawman: { example: '"Senator X wants to reduce military spending." → "Senator X wants to leave us defenseless."', howToDetect: 'Compare the original claim to the version being attacked. Has it been exaggerated or distorted?', whereCommon: 'Political debates, media commentary, social media.', severity: 'High', frequency: 'Extremely Common' },
    f_cherry_picking: { example: '"Studies show coffee is healthy!" (Citing 3 supportive studies while ignoring 20 contradictory ones.)', howToDetect: 'Ask: what is the overall body of evidence? Is the speaker referencing only the subset that supports their view?', whereCommon: 'Science reporting, legal arguments, financial presentations.', severity: 'High', frequency: 'Extremely Common' },
    f_red_herring: { example: '"Why worry about CEO pay when there are people starving in the world?"', howToDetect: 'An irrelevant topic is introduced to distract from the original point. Does this new subject actually address the argument?', whereCommon: 'Political debates, corporate PR, everyday arguments.', severity: 'Medium', frequency: 'Very Common' },
    f_shifting_burden: { example: '"Prove that my miracle cure doesn\'t work."', howToDetect: 'The person making the claim demands that others disprove it. The burden of proof follows the claim.', whereCommon: 'Pseudoscience, conspiracy theories, courtroom tactics.', severity: 'High', frequency: 'Common' },
    b_anchoring: { example: 'A jacket marked down from $500 to $250 feels like a great deal, even if $250 is overpriced. The $500 anchor does all the work.', howToDetect: 'Ask: what number did I see first, and is it affecting my judgment? Try forming an independent estimate before seeing any anchor.', whereCommon: 'Salary negotiation, retail pricing, real estate, legal damage awards.', severity: 'High', frequency: 'Extremely Common' },
    b_loss_aversion: { example: 'A trader holds a losing stock hoping it will recover rather than cutting losses — because selling would make the loss feel "real."', howToDetect: 'Notice asymmetric emotional reactions: does losing $50 hurt more than gaining $50 feels good?', whereCommon: 'Investing, insurance decisions, gambling, relationship decisions.', severity: 'High', frequency: 'Extremely Common' },
    b_endowment: { example: 'You\'re offered $50 for a mug you were just given, but you feel it\'s worth $100 — simply because it\'s now yours.', howToDetect: 'Ask: would I pay the price I\'m asking if I didn\'t already own this?', whereCommon: 'Negotiations, eBay auctions, startup equity valuation.', severity: 'Medium', frequency: 'Very Common' },
    b_sunk_cost: { example: '"I\'ve already spent $10,000 on this business, so I have to keep going." — even when every indicator says to stop.', howToDetect: 'Separate past investment from future returns. Ask: if I were starting fresh today, would I make this choice?', whereCommon: 'Business decisions, relationships, education paths, government projects.', severity: 'High', frequency: 'Extremely Common' },
    b_hyperbolic_disc: { example: 'Choosing $100 now over $150 in one week — even though you\'d easily wait the week if both options were a year away.', howToDetect: 'If your preference reverses as the time horizon shifts, hyperbolic discounting is likely at play.', whereCommon: 'Personal savings, diet decisions, procrastination, addiction.', severity: 'High', frequency: 'Extremely Common' },
    b_framing: { example: '"90% survival rate" vs "10% mortality rate" — identical facts, but people systematically prefer the surgery when framed as survival.', howToDetect: 'Reframe the information in the opposite way. If your preference changes, the frame was driving your decision.', whereCommon: 'Medical decision-making, political messaging, product marketing.', severity: 'High', frequency: 'Extremely Common' },
    b_confirmation: { example: 'A conspiracy theorist finds new "evidence" for their theory everywhere while ignoring any contradictory fact.', howToDetect: 'Actively seek out sources that disagree with you. Do you apply more scrutiny to contradicting evidence than supporting evidence?', whereCommon: 'News consumption, political belief, scientific research, relationships.', severity: 'High', frequency: 'Extremely Common' },
    b_cog_dissonance: { example: 'A smoker who knows smoking is deadly convinces themselves "I exercise, so it balances out."', howToDetect: 'When you receive information contradicting something tied to your identity, watch for rationalisation. The discomfort is the signal.', whereCommon: 'Health decisions, political belief, moral conflicts.', severity: 'Medium', frequency: 'Extremely Common' },
    b_backfire: { example: 'Presenting factual corrections to a false belief causes the person to hold the belief even more strongly.', howToDetect: 'When correcting someone, notice if the correction triggers defensiveness rather than reconsideration.', whereCommon: 'Political debates, vaccine skepticism, conspiracy theories.', severity: 'High', frequency: 'Common' },
    b_belief_bias: { example: 'People accept a logically valid argument simply because the conclusion sounds right, ignoring faulty premises.', howToDetect: 'Evaluate the structure of the argument, not just whether the conclusion sounds true.', whereCommon: 'Everyday reasoning, political discussions, academic evaluations.', severity: 'Medium', frequency: 'Very Common' },
    b_illusory_truth: { example: '"If you repeat a lie often enough, it becomes the truth." Political propaganda exploits this deliberately.', howToDetect: 'Distinguish between familiarity and truth. Ask: have I verified this, or does it just feel familiar?', whereCommon: 'Advertising, propaganda, fake news, social media.', severity: 'High', frequency: 'Extremely Common' },
    b_fundamental_attr: { example: 'Someone cuts you off in traffic — you assume they\'re a reckless idiot, not that they might be rushing to a hospital.', howToDetect: 'When judging behavior, deliberately brainstorm situational explanations before settling on character explanations.', whereCommon: 'Workplace evaluations, criminal justice, interpersonal conflict.', severity: 'High', frequency: 'Extremely Common' },
    b_actor_observer: { example: '"I was late because of traffic. You were late because you\'re disorganised."', howToDetect: 'Notice whether you explain your own mistakes as circumstantial while others\' are dispositional.', whereCommon: 'Performance reviews, relationship conflicts, academic grading.', severity: 'Medium', frequency: 'Very Common' },
    b_self_serving: { example: 'You get a promotion: "My hard work paid off." You don\'t: "The system is rigged."', howToDetect: 'Track whether your explanations systematically favor yourself. Internal attribution for success + external for failure is the red flag.', whereCommon: 'Workplace, sports, academic results, financial decisions.', severity: 'Medium', frequency: 'Extremely Common' },
    b_false_consensus: { example: 'A developer assumes everyone finds command-line interfaces intuitive because they do.', howToDetect: 'Survey a diverse group rather than relying on your intuitions. Your circle is not a representative sample.', whereCommon: 'Product design, politics, social norms, marketing.', severity: 'Medium', frequency: 'Very Common' },
    b_projection: { example: 'A dishonest person assumes everyone around them is also scheming and untrustworthy.', howToDetect: 'When you attribute your own feelings to others without evidence, ask: do I have external evidence, or am I extrapolating from myself?', whereCommon: 'Personal relationships, management, negotiation, politics.', severity: 'Medium', frequency: 'Very Common' },
    b_hindsight: { example: '"I knew the housing crash was going to happen" — said by people who didn\'t act on that knowledge at the time.', howToDetect: 'Before reading the outcome, write down your prediction. This makes it hard to retrospectively reconstruct what you "knew."', whereCommon: 'History education, financial markets, medical diagnosis, legal judgments.', severity: 'High', frequency: 'Extremely Common' },
    b_consistency: { example: 'People who become more liberal over time often remember their past views as having been more liberal than they were.', howToDetect: 'Keep a journal of your actual positions. Memory adjusts your past to be consistent with your present.', whereCommon: 'Personal growth narratives, political memoirs, relationship retrospectives.', severity: 'Low', frequency: 'Common' },
    b_telescoping: { example: 'Events from 10 years ago feel like they happened 5 years ago, while events from last month feel more distant.', howToDetect: 'Always verify dates rather than relying on memory. Temporal intuitions are systematically distorted.', whereCommon: 'Surveys, legal testimony, personal reminiscence.', severity: 'Low', frequency: 'Common' },
    b_cryptomnesia: { example: 'George Harrison unconsciously recreated "He\'s So Fine" by The Chiffons in "My Sweet Lord," genuinely believing he composed it.', howToDetect: 'When you have a "new" idea, trace it back. Have you encountered something similar before?', whereCommon: 'Creative work, academic research, intellectual property disputes.', severity: 'High', frequency: 'Less Common' },
    b_google_effect: { example: 'People who know they can Google something later make no effort to retain it and forget it far more quickly.', howToDetect: 'If you\'re not retaining things you look up, deliberately practice recalling information before checking.', whereCommon: 'Modern knowledge work, education, navigation, fact retention.', severity: 'Medium', frequency: 'Very Common' },
    b_halo: { example: 'Research shows attractive candidates are rated as more intelligent and competent in job interviews — a single trait colors everything.', howToDetect: 'When evaluating someone, assess each trait independently. Would I still rate them as highly on Y if they didn\'t have X?', whereCommon: 'Hiring, education, politics, product design.', severity: 'High', frequency: 'Extremely Common' },
    b_horn: { example: 'Learning that someone was once arrested makes people rate their unrelated work performance lower.', howToDetect: 'Notice if a single negative trait is causing you to globally downgrade a person. Is it actually relevant to the judgment?', whereCommon: 'Criminal records, performance reviews, social reputation.', severity: 'High', frequency: 'Very Common' },
    b_ingroup: { example: 'Studies show people rate identical work as higher quality when told it was produced by an in-group member.', howToDetect: 'Use blind evaluation when possible. Ask: would I rate this the same if I didn\'t know who produced it?', whereCommon: 'Hiring, peer review, sports fandom, political tribes.', severity: 'High', frequency: 'Extremely Common' },
    b_outgroup_homog: { example: '"All politicians are the same" — said by someone who sees great diversity in their own favored politicians.', howToDetect: 'Actively seek out information about variance within the out-group. Uniformity usually reflects lack of information.', whereCommon: 'Racial/ethnic stereotyping, political tribalism, international relations.', severity: 'High', frequency: 'Extremely Common' },
    b_self_fulfilling: { example: 'Teachers told certain students were "gifted" treated them differently — and those students performed better regardless of initial ability.', howToDetect: 'Are my expectations about this person changing how I behave toward them in ways that might create the outcome I expect?', whereCommon: 'Education, management, relationships, financial markets.', severity: 'High', frequency: 'Very Common' },
    b_availability: { example: 'People overestimate the danger of plane crashes vs. car crashes — because plane crashes receive far more dramatic media coverage.', howToDetect: 'Always check base rates. If information comes quickly and vividly to mind, double-check against actual statistics.', whereCommon: 'Risk assessment, media consumption, medical diagnosis.', severity: 'High', frequency: 'Extremely Common' },
    b_representativeness: { example: '"Tom is shy, loves books, detail-oriented — he must be a librarian, not a salesman." (Ignores that there are far more salespeople than librarians.)', howToDetect: 'Always ask: what are the base rates? How common is each category in the real world?', whereCommon: 'Medical diagnosis, criminal profiling, personality judgment.', severity: 'High', frequency: 'Very Common' },
    b_gamblers_fallacy: { example: 'After a roulette wheel lands on red 10 times in a row, people believe black is "due" — even though each spin is independent.', howToDetect: 'Ask: are these events truly independent? If yes, past outcomes have zero predictive power over future outcomes.', whereCommon: 'Gambling, sports predictions, financial trading.', severity: 'High', frequency: 'Extremely Common' },
    b_regression_ignore: { example: 'Praising a student after an exceptional exam, then assuming your praise "caused" their return to average performance.', howToDetect: 'When extreme outcomes are followed by more moderate ones, consider regression before attributing causation to any intervention.', whereCommon: 'Sports, education, management.', severity: 'Medium', frequency: 'Common' },
    b_illusory_corr: { example: 'A nurse believes patients are more agitated on full moon nights — but no statistical relationship exists. Memorable cases stick.', howToDetect: 'Demand a full contingency table. Track all combinations (X+Y, X only, Y only, neither) before concluding a relationship exists.', whereCommon: 'Medical folk knowledge, prejudice formation, superstition.', severity: 'High', frequency: 'Very Common' },
    b_conjunction: { example: '"Linda is a bank teller" vs "Linda is a bank teller active in feminist movements." Most people rate the second as more probable — but it can\'t be.', howToDetect: 'Remember: adding conditions always makes an event less probable. Specificity feels credible but is mathematically less likely.', whereCommon: 'Legal reasoning, everyday probability judgments, medical diagnosis.', severity: 'High', frequency: 'Common' },
    b_dunning_kruger: { example: 'A first-year medical student is more confident in diagnoses than a third-year resident, who has learned how much they don\'t know.', howToDetect: 'Monitor your confidence in unfamiliar domains. Rapid, frictionless certainty is a warning sign.', whereCommon: 'Online debates, new employee syndrome, political commentary.', severity: 'High', frequency: 'Extremely Common' },
    b_illusion_control: { example: 'Pressing the elevator button multiple times because it feels like it makes the elevator arrive faster.', howToDetect: 'Ask: what is the actual mechanism by which my action affects this outcome? If no clear causal pathway exists, the sense of control may be illusory.', whereCommon: 'Gambling, trading, superstition, user interface design.', severity: 'Medium', frequency: 'Very Common' },
    b_optimism: { example: 'Most people believe they are less likely than average to get divorced, even though ~50% of marriages end in divorce.', howToDetect: 'Check whether your estimates of personal risk are consistently below population averages.', whereCommon: 'Health behavior, entrepreneurship, disaster planning.', severity: 'High', frequency: 'Extremely Common' },
    b_illusory_super: { example: 'Studies show ~90% of drivers believe they are above-average drivers. Only 50% can be above average — statistically.', howToDetect: 'When rating yourself, ask: what is the actual distribution of this skill? Am I basing self-assessment on accurate calibration?', whereCommon: 'Self-assessment, job applications, academic performance estimation.', severity: 'Medium', frequency: 'Extremely Common' },
    b_blind_spot: { example: 'People readily identify confirmation bias in political opponents while denying they are equally susceptible themselves.', howToDetect: 'The bias blind spot is uniquely hard to self-diagnose. Assume you have all the same biases as everyone else — because you do.', whereCommon: 'Self-reflection, therapy contexts, debate, research.', severity: 'High', frequency: 'Universal' },
    b_inattentional: { example: 'In the "invisible gorilla" experiment, people counting basketball passes failed to notice a gorilla walk through the scene.', howToDetect: 'When focused on a specific task, periodically broaden your attention. Checklists and systematic scanning help.', whereCommon: 'Air traffic control, surgery, driving, security monitoring.', severity: 'High', frequency: 'Very Common' },
    b_change_blindness: { example: 'In studies, a person asking for directions was swapped mid-conversation — most people didn\'t notice.', howToDetect: 'We detect change primarily through direct attention. Avoid over-relying on "something would have looked different" as proof of stability.', whereCommon: 'Magic performance, film continuity errors, eyewitness testimony.', severity: 'Medium', frequency: 'Common' },
    b_spotlight: { example: 'You spill coffee on your shirt and are convinced everyone at the meeting noticed — when most people didn\'t register it.', howToDetect: 'Other people are primarily focused on themselves. Ask: do I actually notice others\' small embarrassments?', whereCommon: 'Social anxiety, public speaking fear, personal appearance.', severity: 'Low', frequency: 'Extremely Common' },
    assumption: { example: '"We need to expand our sales team to grow revenue." — Assumption: that sales headcount is the binding constraint, not product, market fit, or pricing.', howToDetect: 'Find statements the argument takes for granted. Ask: what would have to be true for this argument to work? Is that actually established?', whereCommon: 'Business strategy, scientific research, everyday plans, policy design.', severity: 'High', frequency: 'Universal' },
  };

  var severityColor = { High: '#d47070', Medium: '#a99fff', Low: '#5ecfba', Universal: '#d4a840' };

  function groupColor(group) {
    if (group === 'Fallacy') return 'var(--fallacy-txt, #9e7060)';
    if (group === 'Bias') return 'var(--bias-txt, #6888a8)';
    if (group === 'Assumption') return 'var(--assumption-txt, #8e8050)';
    return 'var(--text-dim)';
  }

  function isOpen() {
    try {
      var stored = localStorage.getItem(PANEL_KEY);
      if (stored === null) return true; // default: open for new users
      return stored === '1';
    } catch (e) { return true; }
  }

  function setOpen(val) {
    try { localStorage.setItem(PANEL_KEY, val ? '1' : '0'); } catch (e) { }
    var panel = document.getElementById('taxonomy-panel');
    var btn = document.getElementById('tax-toggle-btn');
    if (!panel || !btn) return;
    if (val) {
      // Position first (off-screen, invisible), then reveal in place — zero flash
      panel.style.opacity = '0';
      panel.style.pointerEvents = 'none';
      panel.classList.add('tax-open');
      positionPanel();
    } else {
      panel.classList.remove('tax-open');
      // Fade out in place, then move off-screen after transition ends
      panel.style.opacity = '0';
      panel.style.pointerEvents = 'none';
      setTimeout(function () {
        if (!panel.classList.contains('tax-open')) {
          panel.style.left = '-9999px';
          panel.style.top = '-9999px';
        }
      }, 220);
    }
    btn.classList.toggle('tax-btn-active', val);
  }

  var showDetailGlobal = null; // set by buildPanel

  function buildPanel() {
    var panel = document.getElementById('taxonomy-panel');
    var searchWrap = panel.querySelector('#tax-search-wrap');
    var searchInput = panel.querySelector('#tax-search');
    var listEl = panel.querySelector('#tax-list');
    var detailEl = panel.querySelector('#tax-detail');
    var allItems = Object.values(window.TAXONOMY).flat();

    var countEl = document.getElementById('tax-count');
    if (countEl) countEl.textContent = allItems.length + ' entries';

    function showList() {
      detailEl.style.display = 'none';
      listEl.style.display = '';
      searchWrap.style.display = '';
    }

    function showDetail(item) {
      listEl.style.display = 'none';
      searchWrap.style.display = 'none';
      detailEl.style.display = 'flex';
      detailEl.innerHTML = '';

      var d = ENTRY_DETAIL[item.id] || {};

      // ── Sticky top section ──
      var sticky = document.createElement('div');
      sticky.className = 'tax-detail-sticky';

      // Header = clickable back zone (pill + name + hover arrow)
      var hdr = document.createElement('div');
      hdr.className = 'tax-detail-header tax-detail-header--back';
      hdr.title = 'Back to list';
      hdr.addEventListener('click', showList);

      var backArrow = document.createElement('span');
      backArrow.className = 'tax-back-arrow';
      backArrow.innerHTML = '&#8592;';

      var pill = document.createElement('span');
      pill.className = 'tax-detail-pill tax-pill-' + item.group.toLowerCase();
      pill.textContent = item.group;

      var name = document.createElement('h2');
      name.className = 'tax-detail-name';
      name.textContent = item.name;

      hdr.appendChild(backArrow);
      hdr.appendChild(pill);
      hdr.appendChild(name);
      sticky.appendChild(hdr);

      // Meta row — compact single line
      if (d.severity || d.frequency) {
        var meta = document.createElement('div');
        meta.className = 'tax-detail-meta';
        if (d.severity) {
          var sItem = document.createElement('span');
          sItem.className = 'tax-meta-item';
          sItem.innerHTML = '<span class="tax-meta-label">Severity</span>' +
            '<span class="tax-meta-value" style="color:' + (severityColor[d.severity] || 'var(--text-main)') + '">' + d.severity + '</span>';
          meta.appendChild(sItem);
        }
        if (d.severity && d.frequency) {
          var sep = document.createElement('span');
          sep.className = 'tax-meta-sep';
          sep.textContent = '·';
          meta.appendChild(sep);
        }
        if (d.frequency) {
          var fItem = document.createElement('span');
          fItem.className = 'tax-meta-item';
          fItem.innerHTML = '<span class="tax-meta-label">Prevalence</span>' +
            '<span class="tax-meta-value">' + d.frequency + '</span>';
          meta.appendChild(fItem);
        }
        sticky.appendChild(meta);
      }

      detailEl.appendChild(sticky);

      // ── Scrollable body ──
      var scroll = document.createElement('div');
      scroll.className = 'tax-detail-scroll';

      var body = document.createElement('div');
      body.className = 'tax-detail-body';

      function sec(label, text) {
        var s = document.createElement('div');
        s.className = 'tax-section';
        s.innerHTML = '<div class="tax-section-label">' + label + '</div><div class="tax-section-text">' + text + '</div>';
        body.appendChild(s);
      }

      sec('Definition', item.def);
      if (d.example) sec('Example', d.example);
      if (d.howToDetect) sec('How to detect', d.howToDetect);
      if (d.whereCommon) sec('Where it appears', d.whereCommon);

      // Commands section — show top aliases from cards.js
      if (window.CardAliases && window.CardAliases[item.id]) {
        var aliases = window.CardAliases[item.id].slice(0, 5);
        var cmdsEl = document.createElement('div');
        cmdsEl.className = 'tax-section';
        var lbl = document.createElement('div');
        lbl.className = 'tax-section-label';
        lbl.textContent = 'Chat commands';
        var pills = document.createElement('div');
        pills.className = 'tax-cmd-pills';
        aliases.forEach(function (a) {
          var p = document.createElement('span');
          p.className = 'tax-cmd-pill';
          p.textContent = '!' + a;
          pills.appendChild(p);
        });
        cmdsEl.appendChild(lbl);
        cmdsEl.appendChild(pills);
        body.appendChild(cmdsEl);
      }

      scroll.appendChild(body);
      detailEl.appendChild(scroll);
    }

    function renderList(query) {
      listEl.innerHTML = '';
      var filtered = query ? allItems.filter(function (it) {
        var q = query.toLowerCase();
        return it.name.toLowerCase().includes(q) || it.def.toLowerCase().includes(q);
      }) : null;

      var groups = filtered ? groupFiltered(filtered) : window.TAXONOMY;
      var any = false;

      Object.entries(groups).forEach(function (kv) {
        var grp = kv[0], items = kv[1];
        if (!items.length) return;
        any = true;
        var hdr = document.createElement('div');
        hdr.className = 'tax-group-hdr';
        hdr.textContent = grp;
        hdr.style.color = groupColor(grp);
        listEl.appendChild(hdr);
        items.forEach(function (item) {
          var row = document.createElement('div');
          row.className = 'tax-item';
          row.innerHTML = '<div class="tax-item-name">' + item.name + '</div>';
          row.addEventListener('click', function () { showDetail(item); });
          listEl.appendChild(row);
        });
      });

      if (!any) {
        var empty = document.createElement('div');
        empty.className = 'tax-empty';
        empty.textContent = 'No results for "' + query + '"';
        listEl.appendChild(empty);
      }
    }

    function groupFiltered(items) {
      var out = {};
      Object.keys(window.TAXONOMY).forEach(function (g) { out[g] = []; });
      items.forEach(function (it) { if (out[it.group]) out[it.group].push(it); });
      return out;
    }

    showDetailGlobal = showDetail;

    renderList('');

    searchInput.addEventListener('input', function () {
      showList();
      renderList(searchInput.value.trim());
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { searchInput.value = ''; renderList(''); searchInput.blur(); }
    });
  }

  function init() {
    var btn = document.getElementById('tax-toggle-btn');
    if (!btn) return;

    btn.addEventListener('click', function () { setOpen(!isOpen()); });
    document.getElementById('tax-close-btn').addEventListener('click', function () { setOpen(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'g' && e.key !== 'G') return;
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      setOpen(!isOpen());
    });

    setOpen(isOpen());
    buildPanel();

    // Public API for cards.js to navigate to a specific item
    window.TaxonomyPanel = {
      showItem: function (item) {
        setOpen(true);
        setTimeout(function () { showDetailGlobal(item); }, 10);
      }
    };

    window.addEventListener('resize', positionPanel);
    new MutationObserver(function () {
      if (document.getElementById('taxonomy-panel').classList.contains('tax-open')) {
        setTimeout(positionPanel, 80);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();