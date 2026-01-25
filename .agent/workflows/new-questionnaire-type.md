---
description: Kreiranje novog tipa upitnika od analize do JSON-a
---

# Kreiranje Novog Tipa Upitnika

## Preduslovi

- [ ] Zahtev klijenta je definisan
- [ ] BA i DBA agenti su dostupni

## Koraci

### FAZA 1: Analiza (BA Agent)

1. **Razumi zahtev**
   - Pročitaj zahtev klijenta
   - Identifikuj tip procesa (upitnik/UW/workflow/test)
   - Definiši očekivani ishod

2. **Napravi skicu toka**
   - Listu svih pitanja
   - Logiku grananja (conditional branching)
   - Computed vrednosti ako postoje
   - Scoring pravila

3. **Proveri pokrivenost modela**
   - Otvori `docs/WIWA_Questionnaire_Tables_Roles_*.md`
   - Mapira svaki zahtev na tabelu
   - Dokumentuj gaps

4. **Arhitektonska Validacija (CRITICAL)**
   - Proveri `docs/analysis/09_ARCHITECTURE_SEPARATION.md`
   - **Pravilo**: Da li je ovo pitanje samo za prikupljanje podataka?
   - Ako pravilo podrazumeva korekciju premije -> To ide u UW Modul (`06_PRAVILA`), upitnik samo vraća CODE/VALUE.
   - Proveri `docs/analysis/11_MICROFRONTEND_STRATEGY.md` (Dumb Renderer compatibility)

### FAZA 2: Validacija (DBA Agent)

4. **Validiraj protiv modela**
   ```sql
   -- Proveri postojeće tipove
   SELECT * FROM QuestionnaireTypes;
   
   -- Proveri postojeća pitanja
   SELECT * FROM Questions WHERE QuestionText LIKE '%ključna reč%';
   
   -- Proveri formate
   SELECT * FROM QuestionFormats;
   ```

5. **Identifikuj potrebne promene**
   - Novi QuestionnaireType?
   - Nova pitanja?
   - Novi odgovori?
   - Nove reference tabele?

6. **Generiši DDL** (ako je potrebno proširenje)
   ```sql
   -- Primer: Novi tip upitnika
   INSERT INTO QuestionnaireTypes (Name, Code, QuestionnaireCategoryID)
   VALUES (N'Novi Tip', N'NT', 1);
   ```

### FAZA 3: Implementacija (DBA Agent)

7. **Kreiraj pitanja**
   ```sql
   INSERT INTO Questions (QuestionText, QuestionLabel, QuestionOrder, QuestionFormatID, SpecificQuestionTypeID)
   VALUES (...);
   ```

8. **Kreiraj odgovore**
   ```sql
   INSERT INTO PredefinedAnswers (QuestionID, Answer, Code, PreSelected, StatisticalWeight)
   VALUES (...);
   ```

9. **Definiši grananje**
   ```sql
   INSERT INTO PredefinedAnswerSubQuestions (PredefinedAnswerID, SubQuestionID)
   VALUES (...);
   ```

10. **Mapira na questionnaire**
    ```sql
    INSERT INTO Questionnaires (QuestionnaireTypeID, QuestionID)
    VALUES (...);
    ```

### FAZA 4: Generisanje JSON

11. **Pokreni JSON generator**
    ```sql
    DECLARE @QuestionnaireTypeID SMALLINT = [NOVI_ID];
    -- Izvši JSON_File_Generator_v8_MODEL_18_01_2026.sql
    ```

12. **Validiraj JSON**
    - Sva pitanja prisutna?
    - Grananje ispravno?
    - Reference tabele uključene?

### FAZA 5: Testiranje

13. **Testiraj u rendereru**
    - Otvori `WIWA_Questionnaire_Renderer.html`
    - Importuj generisani JSON
    - Proveri tok pitanja
    - Proveri branching
    - Proveri computed vrednosti

## Output

- [ ] SQL skripte (DDL + DML)
- [ ] JSON fajl upitnika
- [ ] Dokumentacija toka

## Testovi

```javascript
// Test: Root questions se ispravno detektuju
assert(json.questions.length > 0);

// Test: Svako pitanje ima odgovore
json.questions.forEach(q => {
  assert(q.Answers.length > 0);
});

// Test: Branching je definisan
// (SubQuestions array postoji za odgovore sa grananjem)
```
