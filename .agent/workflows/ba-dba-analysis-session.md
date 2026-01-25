---
description: Kompletan ciklus BA + DBA analize za novi zahtev
---

# BA-DBA Analiza Sesija

## Svrha

Strukturirana sesija analize između BA i DBA agenata za novi zahtev klijenta.

## Format sesije

### 1. BA: Prezentacija zahteva

```markdown
## Zahtev: [Naziv]

### Klijent
[Ime klijenta ili projekta]

### Opis
[Šta klijent želi postići]

### Tip procesa
- [ ] Upitnik (Data Collection) -> **Vidi 09_ARCHITECTURE_SEPARATION**
- [ ] UW proces (Business Logic) -> **Vidi 06_PRAVILA_I_PROVERE**
- [ ] Workflow
- [ ] Test/Anketa

### Pitanja (draft)
1. [Pitanje 1]
2. [Pitanje 2]
...

### Očekivani ishod
[Šta je rezultat procesa]
```

### 2. DBA: Validacija modela

```markdown
## Validacija: [Naziv]

### QuestionnaireTypes
- Postojeći tip koji odgovara: [DA/NE - koji?]
- Potreban novi tip: [DA/NE]

### Questions
| Pitanje | Postoji? | Potrebna modifikacija? |
|---------|----------|------------------------|
| P1 | ? | ? |

### PredefinedAnswers
| Pitanje | Odgovori postoje? | Nedostaju? |
|---------|-------------------|------------|
| P1 | ? | ? |

### Branching
| Veza | Postoji u PredefinedAnswerSubQuestions? |
|------|----------------------------------------|
| P1→A1→P3 | ? |

### Reference tabele
| Tabela | Postoji? | Potrebna? |
|--------|----------|-----------|
| ? | ? | ? |

### Zaključak
Model pokriva: [X]%
Potrebna proširenja: [lista]
```

### 3. Zajednički: Rešavanje gaps

```markdown
## Gaps i rešenja

### Gap 1: [opis]
**BA perspektiva**: [šta je potrebno]
**DBA rešenje**: [kako implementirati]
**Odluka**: [finalna odluka]

### Gap 2: ...
```

### 4. Output

```markdown
## Finalna specifikacija

### SQL skripte potrebne
1. [Lista DDL/DML]

### JSON struktura
[Skica strukture]

### Sledeći koraci
1. [...]
```

## Checklist za sesiju

- [ ] BA je pripremio zahtev dokument
- [ ] DBA je pregledao MODEL.sql
- [ ] DBA je pregledao DATA.sql
- [ ] Svi gaps su identifikovani
- [ ] Rešenja su dogovorena
- [ ] Output je dokumentovan
