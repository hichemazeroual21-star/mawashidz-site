# MISSION 007 — Appendix: Risk Register
## 120 Risks with Mitigations

**Legend:** L=Legal, F=Financial, O=Operational, T=Technical, P=Political, S=Security, R=Reputation, V=Vendor, C=Cyber, E=Economic

---

| ID | Category | Risk | Likelihood | Impact | Mitigation |
|----|----------|------|------------|--------|------------|
| R001 | L | Operating without MTA-recognized travel agency license | M | H | Partner with licensed agencies; obtain own license if selling packages |
| R002 | L | Violating Law 18-05 e-commerce requirements (no CNRC, no .dz) | M | H | Register CNRC 607.074; host on .dz; legal counsel |
| R003 | L | Using non-SATIM payment processor for DZD transactions | L | H | SATIM-certified gateway only |
| R004 | L | Escrow model not recognized under Algerian payment law | M | H | Legal opinion from BA; bank custody partnership |
| R005 | L | GDPR violation processing EU diaspora data | M | M | EU hosting option; DPA; privacy policy |
| R006 | L | Loi 18-07 data protection non-compliance | M | M | Local DPO; data minimization |
| R007 | L | Facilitating illegal visa intermediary services | M | H | Never sell slots; dossier assistance only |
| R008 | L | IATA accreditation requirements for direct ticketing | H | M | Host agency model initially |
| R009 | L | Package travel liability under Loi 99-06 | M | H | Insurance; clear T&Cs; licensed partner |
| R010 | L | Cross-border fund transfer restrictions | M | H | DZD-in/DZD-out via SATIM; no offshore settlement |
| R011 | F | FX rate volatility eroding escrow balances | M | M | Same-day settlement; DZD-only escrow |
| R012 | F | Agency default on BSP obligations affecting platform | M | H | Escrow hold until ticket confirmed |
| R013 | F | Chargeback fraud by travelers | M | M | Milestone release; evidence collection |
| R014 | F | Bank failure or liquidity crisis | L | H | Multi-bank relationships; diversify |
| R015 | F | Parallel FX market undermining pricing transparency | H | M | Display both rates; educate users |
| R016 | F | High customer acquisition cost in trust-deficit market | H | M | Agency channel; referral incentives |
| R017 | F | Seasonal revenue concentration (summer, Hajj) | H | M | Diversify segments; subscription revenue |
| R018 | F | Currency inconvertibility trapping inbound revenue | M | M | Partner with local entities for settlement |
| R019 | F | VC funding unavailable for Algeria-focused startup | M | H | Diaspora angel network; revenue-first model |
| R020 | F | Insurance claims exceeding premiums collected | L | M | Reinsurance partnership |
| R021 | O | Agency partners delivering poor service | H | H | Tiered verification; performance scoring |
| R022 | O | Visa rejection after platform-assisted dossier | H | M | Clear disclaimers; no guarantee language |
| R023 | O | Air Algérie operational disruption | H | M | Multi-airline options; delay alerts |
| R024 | O | SATIM payment gateway downtime | M | H | Fallback cash-at-agency with escrow record |
| R025 | O | WhatsApp as primary support channel — no audit trail | H | M | WhatsApp Business API logging |
| R026 | O | Hajj/Omra quota exhaustion mid-season | M | M | Waitlist management; early booking |
| R027 | O | Staff unable to handle Darija/French/Arabic support | M | M | Multilingual team; AI first-line |
| R028 | O | Physical agency resistance to digital platform | H | M | Revenue share; bring customers to them |
| R029 | O | Complaint resolution backlog | M | H | SLA tiers; automated triage |
| R030 | O | Key person dependency on founder | H | H | Document processes; hire COO early |
| R031 | T | GDS API integration complexity | M | M | Amadeus certified partner |
| R032 | T | SATIM API documentation gaps | H | M | Chargily/SlickPay abstraction layer |
| R033 | T | .dz hosting reliability | M | M | Redundant providers; monitoring |
| R034 | T | Mobile app performance on low-end devices | H | M | Lite app version; PWA fallback |
| R035 | T | AI dossier review false positives/negatives | M | H | Human review for high-stakes; confidence scores |
| R036 | T | Scalability during Hajj/Omra peak | M | H | Auto-scaling; load testing |
| R037 | T | Data breach exposing passport copies | L | H | Encryption at rest; minimal retention |
| R038 | T | Integration failure with agency legacy systems | H | M | Manual fallback; phased API adoption |
| R039 | T | Single point of failure on payment webhook | M | H | Idempotent webhooks; reconciliation jobs |
| R040 | T | Technical debt from rapid MVP | H | M | Architecture review at Month 6 |
| R041 | P | Government builds competing public portal | M | H | Position as infrastructure partner to MTA |
| R042 | P | Diplomatic tension reducing visa quotas (France) | M | H | Diversify destinations; student/business segments |
| R043 | P | New FX restrictions reducing travel demand | M | H | Domestic tourism pivot; value messaging |
| R044 | P | Regulatory crackdown on parallel FX references | L | M | Neutral rate display; legal review |
| R045 | P | Agency lobby (SNAV) opposing platform | M | M | SNAV membership; revenue sharing |
| R046 | P | Air Algérie preferential treatment for state agencies | M | M | Private agency coalition |
| R047 | P | Election-period policy instability | M | M | Regulatory monitoring; scenario planning |
| R048 | P | Saudi regulation change affecting Hajj/Omra | M | H | ONPO relationship; rapid adaptation |
| R049 | P | Banque d'Algérie rejecting escrow model | M | H | Early BA engagement; sandbox application |
| R050 | P | Import restrictions on technology hardware | L | M | Cloud .dz hosting; local partners |
| R051 | S | Passport data theft by insider | L | H | RBAC; audit logs; background checks |
| R052 | S | Physical threat to staff from scammers exposed | L | H | Anonymized reporting; legal support |
| R053 | S | Agency collusion to manipulate platform ratings | M | M | Verified transaction-based ratings only |
| R054 | S | Money laundering through travel bookings | M | H | KYC; transaction monitoring; BA reporting |
| R055 | S | Terrorist financing scrutiny on pilgrimage funds | L | H | ONPO compliance; enhanced due diligence |
| R056 | S | Kidnapping/ransom misassociation (Sahara tours) | L | H | Verified guide registry; insurance requirements |
| R057 | S | Social engineering of elderly travelers | H | M | Family dashboard; payment alerts |
| R058 | S | Fake platform impersonation (phishing) | M | H | Verified app stores; domain monitoring |
| R059 | S | Bribery attempts by low-quality agencies | M | M | Anti-corruption policy; whistleblower channel |
| R060 | S | State security interest in travel data | M | M | Legal compliance; transparency reports |
| R061 | R | Association with agency fraud scandal | M | H | Rapid delisting; public response protocol |
| R062 | R | Viral social media complaint | H | M | 24h response SLA; escalation team |
| R063 | R | "Platform guaranteed visa" misconception | H | H | Never use "guarantee" for visas |
| R064 | R | Diaspora community backlash on pricing | M | M | Transparent fee breakdown |
| R065 | R | Negative comparison to informal broker "success" | M | M | Education content; legal risk warnings |
| R066 | R | Media portrayal as foreign interference | L | H | Algerian co-founders; local entity |
| R067 | R | Religious sensitivity in Hajj/Omra marketing | M | H | ONPO-approved messaging; religious advisors |
| R068 | R | Data leak destroying trust permanently | L | H | Security-first architecture; insurance |
| R069 | R | Competitor spreading FUD about escrow safety | M | M | Bank partnership branding; audits |
| R070 | R | Founder credibility deficit (no travel industry background) | M | M | Hire industry veterans; advisory board |
| R071 | V | Amadeus contract termination | L | H | Multi-GDS strategy; Sabre backup |
| R072 | V | SATIM changing API without notice | M | M | Abstraction layer; monitoring |
| R073 | V | Chargily/SlickPay regulatory issue | M | M | Direct SATIM fallback |
| R074 | V | Cloud .dz provider outage | M | H | Multi-region within Algeria |
| R075 | V | Insurance partner withdrawal | L | M | Multiple underwriters |
| R076 | V | WhatsApp API policy change (Meta) | M | M | SMS/email backup channels |
| R077 | V | Air Algérie API access denied | H | M | GDS path; agency manual entry |
| R078 | V | Capago refusing partnership | H | L | Independent dossier tools only |
| R079 | V | Bank partner changing merchant terms | M | M | Multi-bank acquiring |
| R080 | V | OpenAI/AI provider data residency issues | M | M | On-premise model for passport docs |
| R081 | C | DDoS attack during peak booking | M | M | CDN; rate limiting; WAF |
| R082 | C | SQL injection on booking forms | L | H | OWASP practices; pen testing |
| R083 | C | Credential stuffing on user accounts | M | M | MFA; CAPTCHA; breach detection |
| R084 | C | Man-in-the-middle on SATIM redirect | L | H | Certificate pinning; HTTPS only |
| R085 | C | Ransomware on .dz servers | L | H | Backups; offline recovery; cyber insurance |
| R086 | C | API key exposure in mobile app | M | H | Server-side proxy; key rotation |
| R087 | C | Supply chain attack on npm/pip dependencies | M | M | Dependency scanning; lockfiles |
| R088 | C | Insider threat — developer access to PII | L | H | Least privilege; SOC2 path |
| R089 | C | Session hijacking on shared family devices | M | M | Short sessions; biometric option |
| R090 | C | Scraping of agency/pricing data by competitors | H | L | Rate limits; ToS enforcement |
| R091 | E | Oil price collapse reducing Algerian purchasing power | M | H | Budget segment; domestic focus |
| R092 | E | Global recession reducing diaspora travel | M | M | Essential travel segments (family, medical) |
| R093 | E | Inflation eroding escrow fee viability | M | M | Volume-based pricing adjustment |
| R094 | E | Unemployment reducing outbound travel demand | M | M | Student/visa segments; payment plans |
| R095 | E | Euro strengthening vs DZD worsening travel affordability | M | H | Total-cost transparency; early booking |
| R096 | E | Competition from Turkish/Moroccan alternative destinations | M | L | Destination education; package value |
| R097 | E | Jumia exit reducing e-commerce trust broadly | M | L | Differentiate with escrow; physical presence |
| R098 | E | Brain drain — losing technical talent abroad | H | M | Competitive remote compensation |
| R099 | E | Real estate/construction boom diverting investment | M | L | Demonstrate travel tech ROI |
| R100 | E | Black market FX crackdown affecting traveler spending | M | M | Legal FX education; official allocation help |
| R101 | L | ANAC passenger rights claims against platform | L | M | Clear intermediary role; airline direct claims |
| R102 | O | Capago 72-hour payment window causing missed appointments | M | M | Calendar integration; payment reminders |
| R103 | T | Biometric data handling for visa dossier uploads | M | H | No storage of biometric; redirect to official |
| R104 | P | MTA refusing data sharing partnership | M | H | Manual verification fallback; FOIA-style requests |
| R105 | F | Refund liability exceeding escrow float | L | H | Reserve fund; insurance bond |
| R106 | S | Document forgery detection failure | M | H | AI + manual review; agency liability clause |
| R107 | R | Platform blamed for Air Algérie payment failures | H | M | Separate airline issues from platform issues |
| R108 | O | Domestic Airlines integration uncertainty (new entity) | M | M | Monitor ANAC; flexible inventory model |
| R109 | T | Offline-first requirement for southern wilayas | H | M | SMS-based booking confirmation |
| R110 | P | EU AI Act affecting dossier review tool | L | M | Human-in-loop; transparency |
| R111 | F | BSP bank guarantee requirement for own IATA accreditation | M | M | Host agency indefinitely if needed |
| R112 | O | Ramadan/Hajj calendar shifting demand unpredictably | H | M | Dynamic capacity planning |
| R113 | S | Platform used to launder visa bribe payments | L | H | Prohibited use policy; transaction monitoring |
| R114 | R | Influencer paid promotion without disclosure | M | M | Advertising standards compliance |
| R115 | V | Telegram bot competitors offering "visa alerts" | H | L | Superior product; official data sources |
| R116 | E | Tourism 2030 strategy shifting government priorities | M | M | Align with SDAT2030 inbound goals |
| R117 | O | French consulate further reducing visa numbers | M | H | Multi-destination strategy |
| R118 | T | Legacy agency software (DOS-based GDS terminals) | H | M | Web-based agency portal |
| R119 | L | Auto-entrepreneur status insufficient for travel activity | M | M | Full CNRC registration from Day 1 |
| R120 | P | Yassir launching competing trust features | M | H | Speed to market; partnership option |

---

## Risk Heat Map Summary

| Category | Count | Highest Priority |
|----------|-------|------------------|
| Legal | 14 | R004 (escrow legality), R007 (visa intermediation) |
| Financial | 14 | R012 (agency BSP default), R019 (funding) |
| Operational | 18 | R021 (agency quality), R029 (complaints) |
| Technical | 16 | R037 (passport breach), R039 (payment webhook) |
| Political | 14 | R049 (BA rejection), R041 (govt competition) |
| Security | 14 | R054 (AML), R055 (pilgrimage financing) |
| Reputation | 12 | R063 (visa guarantee misconception) |
| Vendor | 12 | R071 (Amadeus), R077 (Air Algérie API) |
| Cybersecurity | 12 | R085 (ransomware), R084 (MITM) |
| Economic | 12 | R095 (EUR/DZD), R091 (oil price) |

**Top 10 Risks to Address in First 90 Days:** R003, R004, R007, R012, R021, R037, R049, R054, R063, R077
