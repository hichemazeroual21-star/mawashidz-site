# MawashiDZ — Field Research Plan
**Canonical path:** `docs/constitution/FIELD_RESEARCH.md`
**Status:** Planning — not yet executed
**Priority:** Critical before Phase 3 feature decisions

---

> Features built without field research are features built for imaginary users.
> This document defines the research that must happen before major product decisions are finalized.
> No research = assumption. Assumptions are labeled as such in the Constitution.

---

## Research Priority Order

1. Breeders — highest priority (primary users)
2. Buyers — second priority (drives marketplace activity)
3. Veterinarians — third priority (trust and health layer)
4. Weekly markets — direct observation
5. Technology environment — device and connectivity research

---

## 1. Breeder Research

### Objective
Understand how breeders currently operate so the platform solves real problems rather than imaginary ones.

### Method
Semi-structured interviews. Target 20–30 breeders across:
- At least 3 different wilayas (urban, semi-rural, rural)
- At least 2 species (sheep breeders, cattle breeders)
- Mix of small herds (<50) and medium herds (50–200)

### Research Questions

**Current workflows (before MawashiDZ):**
- How do you currently register or identify your animals? (ear tag, brand, microchip, written records, nothing)
- Do you currently maintain vaccination records? How? (paper book, phone notes, nothing)
- How do you currently sell livestock? (weekly market, phone calls, social media, WhatsApp groups, word of mouth)
- How do you negotiate prices? (fixed asking price, open negotiation, broker)
- When a buyer asks about an animal's health, what do you tell them? What do you show them?
- Do you currently receive any official veterinary documents for your animals?
- How do you find a veterinarian when you need one?
- Do you buy feed from a regular supplier? How do you find new suppliers?

**Technology environment:**
- What smartphone do you use? (brand, model approximate)
- Do you use 4G / 3G / WiFi regularly?
- What apps do you use daily? (WhatsApp, Facebook, Ouedkniss?)
- Have you ever bought or sold anything online?
- What do you think prevents other breeders from using digital tools?

**Pain points:**
- What is the most time-consuming part of running your herd?
- What do you wish existed that doesn't?
- What frustrates you most when selling livestock?
- Have you ever been deceived when buying or selling livestock?

**Platform design signals:**
- If you could show a buyer one thing to build trust, what would it be?
- Would you trust a digital health certificate from a platform like MawashiDZ?
- Would you want to manage your herd records on a phone app?
- What would make you recommend this platform to other breeders?

### Expected Findings
- Most breeders have minimal digital records
- WhatsApp is the dominant tool for remote livestock commerce
- Trust is built on personal relationships and physical inspection
- Internet connectivity varies dramatically by region

### Output Required
A written research report with:
- Behavioral patterns (what breeders actually do)
- Mental models (how they think about their work)
- Feature validation (which proposed features align with real needs)
- Feature rejection (which proposed features are irrelevant)

---

## 2. Buyer Research

### Objective
Understand what buyers need to commit to a purchase without seeing the animal in person.

### Method
Interviews with 10–15 buyers. Include household buyers (Eid al-Adha), commercial buyers (butchers, farms).

### Research Questions
- What information do you always ask for before buying an animal? (age, weight, health history, vaccination status, breed)
- What makes you trust a seller you've never met?
- Have you ever been deceived when buying livestock? What happened?
- Would a verified health certificate from a licensed vet influence your decision?
- Would you pay a premium for an animal with documented vaccination history?
- How do you currently find livestock for sale?
- What prevents you from completing a purchase online?
- Do you need to see the animal in person before buying?

### Output Required
A list of trust signals (what actually matters to buyers) and friction points (what prevents buying).

---

## 3. Veterinarian Research

### Objective
Understand the professional workflow and what digital tools would genuinely help (or hinder) veterinarians.

### Method
Interviews with 5–10 licensed veterinarians from different wilayas and practice types (clinic, mobile, farm visits).

### Research Questions
- Do you currently maintain digital records for farm animals?
- Do you use any software for record keeping?
- What percentage of your work is farm visits vs. clinic consultations?
- What documents do you issue today? (vaccination certificates, health certificates, prescriptions)
- Are these documents paper or digital?
- What is the biggest administrative burden in your practice?
- If breeders could request your services through a platform, how would you want that to work?
- What would make you trust a platform to carry your professional reputation?
- What professional information would you be comfortable making publicly visible?
- Would you pay a subscription fee for professional tools?

### Output Required
Professional workflow map and feature priority list from vet perspective.

---

## 4. Weekly Market Observation

### Objective
Observe how transactions actually work at a real Algerian livestock market (سوق الماشية).

### Method
Direct observation at 2–3 weekly markets in different regions. Minimum 2 full market days.

### Observe
- How are animals displayed and examined
- What information buyers request from sellers
- How prices are set and negotiated
- Role of brokers in transactions
- Documentation that changes hands (if any)
- How disputes are handled
- What trust signals are used (physical inspection, reputation, referral)
- How buyers verify animal health
- Pain points visible in the process

### Output Required
Behavioral observation report with implications for marketplace design.

---

## 5. Technology Environment Research

### Objective
Understand the real digital environment of the target users to ensure the platform works for them.

### Method
Combine interview observations (above) with public data research.

### Research Questions
- What are the most common smartphones among Algerian breeders and rural users?
- What is the typical mobile data speed in rural wilayas?
- What is the typical upload speed for a photo in a rural area?
- What percentage of the target audience uses 4G vs. 3G vs. 2G?
- What screen resolutions are most common?
- What operating systems (iOS vs. Android, version distribution)?
- Is WhatsApp universally adopted in the target population?

### Implications
- Determines minimum performance requirements
- Determines photo upload size limits
- Determines whether PWA or native app is necessary
- Determines whether video support is practical

---

## Research Timeline

| Research | Target Timing | Blocks Feature |
|----------|--------------|----------------|
| Breeder interviews | Before Phase 2 | Animal data model design, listing UX |
| Market observation | Before Phase 2 | Marketplace workflow design |
| Buyer interviews | Before Phase 2 public launch | Trust features, listing design |
| Vet interviews | Before Phase 3 | Veterinary workspace, certificates |
| Technology environment | Before Phase 1 complete | Performance targets, offline strategy |

---

## Research Governance

- All interviews must be conducted with informed consent
- No personal identifying information from interviews should be stored in platform systems
- Research findings should be published internally as brief reports in `docs/research/`
- No major feature should be built in Phase 2+ without at least one supporting research finding or explicitly labeled as an assumption

---

*This document is reviewed and updated as research is completed.*
*Completed research should be linked to relevant sections of the Constitution.*
