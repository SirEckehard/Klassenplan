# Pedagogical Foundations and Design Decisions

This document explains the pedagogical assumptions Klassenplan is built on, why the default weights are set the way they are, and where the tool's limits lie. It is aimed at developers extending the model as well as teachers who want to understand which value judgments the tool encodes.

---

## 1. What Klassenplan can do – and what it cannot

According to educational research, seating arrangements have a small but measurable effect on learning behavior:

- Wannarka & Ruhl (2008): Row arrangements can reduce off-task behavior during individual work
- Marx, Fuhrer & Hartig (1999): Seating layout influences question frequency (horseshoe > rows)
- Hattie (2009, *Visible Learning*): Effect size of seating arrangement d ≈ 0.1–0.2 – well below feedback (d ≈ 0.73) or formative assessment

Klassenplan's main value therefore lies not in the *optimal* seating plan, but in **relieving the teacher's cognitive preparation load** and **structuring reflection** about class composition. The algorithm's output is a suggestion, not a decision.

---

## 2. Attributes: contextual, not diagnostic

All student attributes in Klassenplan (`restless`, `shy`, `concentrationIssues`, `performanceStrong`, `performanceWeak`, `sensoryImpairment`, `socialRole`) are intended as **contextual descriptions of current behavior**, not as stable diagnoses or personality traits.

Theoretical background:

- **Labeling theory** (Becker 1963; Rist 1970): Once a category is assigned, it feeds back into the assigner's own actions and can permanently shape how the labeled person is perceived.
- **Pygmalion effect** (Rosenthal & Jacobson 1968): Teacher expectations influence student performance. A digital tool that codifies these expectations can amplify the effect.

**Recommendations for teachers:**
- Review and update attributes regularly (at least once per school term)
- Use attributes as a tool for seating-plan optimization, not as character descriptions of children
- Reflect on attributes in student conversations where pedagogically appropriate

### Special case: `sensoryImpairment`

This field very likely touches **Art. 9 GDPR** (special categories of personal data: health). Before recording it, teachers should make sure there is an appropriate legal basis (e.g. consent from legal guardians, or a school-law basis). German state-level school data-protection regulations (NRW: VO-DV I; Bavaria: BaySchO; BW: DatenschutzVO Schule) may impose stricter requirements than the GDPR.

---

## 3. Rationale for the default weights

The weights in [`src/utils/mixSettings.ts`](../src/utils/mixSettings.ts) are normative choices, made transparent here.

| Criterion | Default | Rationale |
|---|---|---|
| `considerWishPartners` | 8 | Respecting preferred partners is the strongest student preference we can capture directly; high social legitimacy |
| `avoidConflictPartners` | 7 | Conflict avoidance has an immediate effect on classroom climate; slightly below preferred partners |
| `avoidPreviousPairs` | 6 | Prevents stagnation and encourages new social contacts; broadly accepted in pedagogy |
| `avoidRestlessTogether` | 5 | Evidence for disruption reduction through spatial separation (Wannarka & Ruhl 2008) |
| `avoidConcentrationTogether` | 5 | Analogous to `avoidRestlessTogether`; equal weight is deliberate |
| `avoidConcentrationNearRestless` | 5 | Interaction between restless and distractible behavior |
| `preferLanguageMixing` | 4 | Language support through proximity is pedagogically plausible, but not a direct language-support measure (Gogolin & Lange 2011) |
| `peerTutoring` | 3 | Effective (Hattie d ≈ 0.55), but only with didactic framing; spatial proximity alone does not create peer tutoring |
| `homogeneousPerformanceGroups` | 3 | Weak evidence (Hattie d ≈ 0.12); parity with `peerTutoring` is deliberate, as both approaches are legitimate |
| `preferFrontForSensoryImpairment` | 5 | Important accessibility measure; higher weight is justified |
| `preferFrontForSmallerStudents` | 3 | Visibility heuristic; pragmatic, but no research backing |
| `preferGenderMix` | 2 | Deliberately low weight; gender categories are complex (Butler 1990); the default signals optionality |
| `avoidShyAlone` | 2 | Social inclusion matters; low weight because it is hard to operationalize |
| `preferWindowSeats` / `preferDoorSeats` | 3 / 2 | Individual spatial preferences; no pedagogical evidence, but high subjective relevance |
| `distributeSocialRoles` | 3 | Balanced table composition as a general heuristic |

### Tension between `peerTutoring` and `homogeneousPerformanceGroups`

Both criteria are active and equally weighted. This is intentional: teachers should be able to choose. When both are active simultaneously, their effects partially neutralize each other. A future version of the tool could turn these into an either/or option (P1, review section C.2).

---

## 4. Peer tutoring

Peer tutoring is one of the most effective learning methods (Hattie d ≈ 0.55; Topping 2005), but **only with didactic framing** (role clarity, task rotation, teacher monitoring). A seating plan produces spatial proximity, not a tutoring relationship. Activating the `peerTutoring` criterion therefore makes sense when teachers actively plan peer-tutoring phases – it should not be understood as a passively effective measure.

---

## 5. Language mixing (DaZ)

The `preferLanguageMixing` criterion pairs language-strong students with DaZ students (*Deutsch als Zweitsprache* – German as a second language). Pedagogically well-intentioned, but worth critical reflection:

- Language support has to happen **didactically and methodically**, not through spatial proximity alone (Gogolin & Lange 2011)
- The language-strong child can be pushed into a translator role, which can strain the relationship (Dirim & Mecheril 2010)
- Two DaZ children sharing a first language can support each other productively through translanguaging (García & Wei 2014)

This criterion should be activated context-specifically, not as a permanent setting.

---

## 6. Social roles

The `loner` value in `SocialRole` describes introverted or independently working behavior. Introversion is a neutral personality dimension (Cain 2012), not a pedagogical weakness. The algorithm therefore classifies `loner` as `neutral` – the scoring code preferentially places students with this attribute next to mediator or social-hub roles, without treating them as a problem.

---

## 7. Further reading

- Becker, H. S. (1963). *Outsiders: Studies in the Sociology of Deviance*. Free Press.
- Butler, J. (1990). *Gender Trouble*. Routledge.
- Cain, S. (2012). *Quiet: The Power of Introverts in a World That Can't Stop Talking*. Crown.
- Dirim, İ., & Mecheril, P. (2010). Die Sprache(n) der Migrationsgesellschaft. In P. Mecheril et al., *Migrationspädagogik*. Beltz.
- García, O., & Wei, L. (2014). *Translanguaging: Language, Bilingualism and Education*. Palgrave Macmillan.
- Gogolin, I., & Lange, I. (2011). *Bildungssprache und Durchgängige Sprachbildung*. Waxmann.
- Hattie, J. (2009). *Visible Learning: A Synthesis of Over 800 Meta-Analyses Relating to Achievement*. Routledge.
- O'Neil, C. (2016). *Weapons of Math Destruction*. Crown.
- Reich, K. (2014). *Inklusive Didaktik: Bausteine für eine inklusive Schule*. Beltz.
- Rist, R. C. (1970). Student Social Class and Teacher Expectations. *Harvard Educational Review*, 40(3).
- Rosenthal, R., & Jacobson, L. (1968). *Pygmalion in the Classroom*. Holt, Rinehart and Winston.
- Slavin, R. E. (1995). *Cooperative Learning: Theory, Research, and Practice* (2nd ed.). Allyn & Bacon.
- Topping, K. J. (2005). Trends in peer learning. *Educational Psychology*, 25(6).
- Wannarka, R., & Ruhl, K. (2008). Seating arrangements that promote positive academic and behavioural outcomes. *Support for Learning*, 23(2).
