// taxonomy.js
window.TAXONOMY = {
    Fallacy: [
        // ── Tier 1: Universal — appear daily in politics, social media, news ──
        { id: "f_ad_hominem", name: "Ad Hominem", group: "Fallacy", def: "Attacking the person's character or circumstances instead of addressing their argument." },
        { id: "f_strawman", name: "Strawman", group: "Fallacy", def: "Misrepresenting or exaggerating someone's argument to make it easier to attack." },
        { id: "f_false_dilemma", name: "False Dilemma (Black-or-White)", group: "Fallacy", def: "Presenting only two alternative options when more exist." },
        { id: "f_appeal_emotion", name: "Appeal to Emotion", group: "Fallacy", def: "Manipulating an emotional response in place of a valid or compelling argument." },
        { id: "f_ad_populum", name: "Bandwagon (Ad Populum)", group: "Fallacy", def: "Claiming something is true or good simply because many people agree with it." },
        { id: "f_cherry_picking", name: "Cherry Picking", group: "Fallacy", def: "Selecting only data that supports your position while ignoring contradictory evidence." },
        { id: "f_slippery_slope", name: "Slippery Slope", group: "Fallacy", def: "Arguing that a small first step will inevitably lead to a chain of extreme events." },

        // ── Tier 2: Very Common — frequent in debates, advertising, journalism ──
        { id: "f_appeal_authority", name: "Appeal to Authority", group: "Fallacy", def: "Relying on the opinion of an authority figure, especially outside their specific expertise." },
        { id: "f_red_herring", name: "Red Herring", group: "Fallacy", def: "Introducing an irrelevant topic to distract from the original issue." },
        { id: "f_post_hoc", name: "False Cause (Post Hoc)", group: "Fallacy", def: "Assuming that because event B comes after event A, event A caused event B." },
        { id: "f_cum_hoc", name: "Correlation vs. Causation", group: "Fallacy", def: "Assuming that because two things happen simultaneously, one causes the other." },
        { id: "f_appeal_fear", name: "Appeal to Fear", group: "Fallacy", def: "Using threats or scary scenarios to force agreement rather than using logic." },
        { id: "f_appeal_tradition", name: "Appeal to Tradition", group: "Fallacy", def: "Arguing that something is better or correct simply because it is older or traditional." },
        { id: "f_begging_q", name: "Begging the Question", group: "Fallacy", def: "The conclusion of the argument is embedded in the premise — circular reasoning." },

        // ── Tier 3: Common — regularly appear once you know what to look for ──
        { id: "f_loaded_q", name: "Loaded Question", group: "Fallacy", def: "Asking a question that contains an unjustified, built-in assumption." },
        { id: "f_shifting_burden", name: "Shifting the Burden of Proof", group: "Fallacy", def: "Demanding that the opponent disprove your claim, rather than proving it yourself." },
        { id: "f_appeal_ignorance", name: "Appeal to Ignorance", group: "Fallacy", def: "Assuming a claim is true because it hasn't been proven false (or vice versa)." },
        { id: "f_appeal_nature", name: "Appeal to Nature", group: "Fallacy", def: "Arguing that something is good or right because it is natural, or bad because it is unnatural." },
        { id: "f_equivocation", name: "Equivocation", group: "Fallacy", def: "Using a word in two different senses within the same argument, causing confusion." },

        // ── Tier 4: Niche — more technical, less commonly named in everyday use ──
        { id: "f_appeal_novelty", name: "Appeal to Novelty", group: "Fallacy", def: "Arguing that something is better simply because it is new or modern." },
        { id: "f_consequent", name: "Affirming the Consequent", group: "Fallacy", def: "Assuming that if a condition is met, the reverse must also be true." },
        { id: "f_antecedent", name: "Denying the Antecedent", group: "Fallacy", def: "Assuming that if the premise is false, the conclusion must also be false." }
    ],

    Bias: [
        // ── Tier 1: Culturally ubiquitous — household names ──
        { id: "b_confirmation", name: "Confirmation Bias", group: "Bias", def: "Searching for, interpreting, and recalling information in a way that confirms one's pre-existing beliefs." },
        { id: "b_dunning_kruger", name: "Dunning-Kruger Effect", group: "Bias", def: "People with limited knowledge in a domain overestimate their competence, while true experts tend to underestimate theirs." },
        { id: "b_sunk_cost", name: "Sunk Cost Fallacy", group: "Bias", def: "Continuing a behavior or endeavor because of previously invested resources (time, money, effort) that cannot be recovered." },
        { id: "b_availability", name: "Availability Heuristic", group: "Bias", def: "Overestimating the probability of events that are easy to recall — vivid, recent, or emotionally charged events feel more likely." },

        // ── Tier 2: Very well known — taught widely in psychology and pop-science ──
        { id: "b_fundamental_attr", name: "Fundamental Attribution Error", group: "Bias", def: "Overemphasizing personal characteristics (laziness, greed) and ignoring situational factors when judging others' behavior." },
        { id: "b_anchoring", name: "Anchoring Bias", group: "Bias", def: "Over-relying on the first piece of information encountered when making decisions. That initial 'anchor' disproportionately shapes all subsequent judgments." },
        { id: "b_halo", name: "Halo Effect", group: "Bias", def: "A single positive trait (attractiveness, confidence) causes an overall positive evaluation of a person, overshadowing their other qualities." },
        { id: "b_loss_aversion", name: "Loss Aversion", group: "Bias", def: "Losses feel roughly twice as painful as equivalent gains feel good, causing people to make irrational decisions to avoid losses." },
        { id: "b_self_serving", name: "Self-Serving Bias", group: "Bias", def: "Attributing successes to your own abilities and character, while attributing failures to external circumstances." },
        { id: "b_cog_dissonance", name: "Cognitive Dissonance", group: "Bias", def: "The discomfort of holding contradictory beliefs, leading people to reject information that conflicts with their identity or prior emotional investment." },
        { id: "b_hindsight", name: "Hindsight Bias", group: "Bias", def: "'I knew it all along' — the tendency to see past events as having been predictable, distorting what you actually knew beforehand." },
        { id: "b_gamblers_fallacy", name: "Gambler's Fallacy", group: "Bias", def: "Believing that past independent random events affect future ones — e.g., thinking a coin is 'due' for heads after several tails." },

        // ── Tier 3: Common — well recognized, frequently discussed ──
        { id: "b_ingroup", name: "In-Group Bias", group: "Bias", def: "Favoring members of one's own group over outsiders, often unconsciously — rating them as more trustworthy, capable, or deserving." },
        { id: "b_framing", name: "Framing Effect", group: "Bias", def: "Drawing different conclusions from the same information depending on how it is presented (e.g., '90% survival rate' vs '10% mortality rate')." },
        { id: "b_illusory_super", name: "Illusory Superiority", group: "Bias", def: "Most people believe they are above average in most positive traits — a statistical impossibility known as the 'Lake Wobegon effect'." },
        { id: "b_optimism", name: "Optimism Bias", group: "Bias", def: "'That won't happen to me' — systematically underestimating the likelihood of negative events affecting oneself." },
        { id: "b_self_fulfilling", name: "Self-Fulfilling Prophecy", group: "Bias", def: "Holding an expectation about someone causes behavior that makes that expectation come true, confirming the original belief." },
        { id: "b_illusory_truth", name: "Illusory Truth Effect", group: "Bias", def: "Repeated exposure to a statement increases the likelihood of believing it to be true, regardless of its actual accuracy." },
        { id: "b_false_consensus", name: "False Consensus Effect", group: "Bias", def: "Overestimating how many other people share your opinions, behaviors, and values." },
        { id: "b_representativeness", name: "Representativeness Heuristic", group: "Bias", def: "Judging the probability of an event by how closely it matches a prototype or stereotype, ignoring base rates." },
        { id: "b_blind_spot", name: "Bias Blind Spot", group: "Bias", def: "Easily recognizing cognitive biases in others while remaining unaware of the same biases in oneself." },

        // ── Tier 4: Moderately known — appear in workplace, relationships, everyday reasoning ──
        { id: "b_spotlight", name: "Spotlight Effect", group: "Bias", def: "Overestimating how much other people notice your appearance, mistakes, or behavior — feeling like you're under a spotlight." },
        { id: "b_backfire", name: "Backfire Effect", group: "Bias", def: "When confronted with evidence that contradicts a belief, people sometimes hold that belief more strongly rather than updating it." },
        { id: "b_endowment", name: "Endowment Effect", group: "Bias", def: "People overvalue things simply because they own them, demanding more to give something up than they would pay to acquire it." },
        { id: "b_hyperbolic_disc", name: "Hyperbolic Discounting", group: "Bias", def: "Strongly preferring smaller immediate rewards over larger future ones — valuing the present disproportionately over the future." },
        { id: "b_actor_observer", name: "Actor-Observer Bias", group: "Bias", def: "Explaining your own mistakes as caused by the situation, but others' mistakes as caused by their character." },
        { id: "b_outgroup_homog", name: "Out-Group Homogeneity Bias", group: "Bias", def: "Perceiving members of other groups as more similar to each other than members of your own group are ('they're all the same')." },
        { id: "b_inattentional", name: "Inattentional Blindness", group: "Bias", def: "Failing to notice something obvious in plain sight because attention is focused elsewhere (e.g., the 'invisible gorilla' experiment)." },
        { id: "b_illusion_control", name: "Illusion of Control", group: "Bias", def: "Believing you have more control over random or uncontrollable events than you actually do." },
        { id: "b_illusory_corr", name: "Illusory Correlation", group: "Bias", def: "Perceiving a relationship between two variables that does not actually exist, often because both are unusual or memorable." },

        // ── Tier 5: Technical / academic — less commonly named in daily life ──
        { id: "b_horn", name: "Horn Effect", group: "Bias", def: "A single negative trait causes an overall negative evaluation of a person, even when unrelated to the judgment at hand." },
        { id: "b_belief_bias", name: "Belief Bias", group: "Bias", def: "Evaluating the strength of an argument based on whether you agree with its conclusion, rather than its logical structure." },
        { id: "b_conjunction", name: "Conjunction Fallacy", group: "Bias", def: "Judging a specific scenario as more probable than a more general one that encompasses it (e.g., thinking A+B is more likely than just A)." },
        { id: "b_regression_ignore", name: "Ignoring Regression to the Mean", group: "Bias", def: "Seeing a meaningful pattern in data that is actually just random variation naturally returning toward average." },
        { id: "b_projection", name: "Projection Bias", group: "Bias", def: "Assuming that others think, feel, and want the same things as you do." },
        { id: "b_change_blindness", name: "Change Blindness", group: "Bias", def: "Failing to detect significant changes in a visual scene, especially when attention is directed elsewhere or during interruptions." },
        { id: "b_google_effect", name: "Google Effect", group: "Bias", def: "The tendency to forget information that can be easily found online, since the brain offloads memory to external sources." },
        { id: "b_consistency", name: "Consistency Bias", group: "Bias", def: "Misremembering past attitudes and behaviors as more consistent with current ones than they actually were." },
        { id: "b_telescoping", name: "Telescoping Effect", group: "Bias", def: "Perceiving recent events as more remote and distant events as more recent than they actually are." },
        { id: "b_cryptomnesia", name: "Cryptomnesia", group: "Bias", def: "Forgetting that a memory is a memory — mistaking a previously encountered idea for an original thought." }
    ],

    Assumption: [
        { id: "assumption", name: "Assumption", group: "Assumption", def: "An unstated premise that the argument absolutely relies on to be valid. If this hidden premise is false, the entire argument collapses." }
    ]
};