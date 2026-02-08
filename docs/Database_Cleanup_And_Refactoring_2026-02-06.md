# Database Cleanup and Backend Refactoring - 2026-02-06

## Problem

Baza podataka je sadržala veliki broj redundantnih i orphaned zapisa koji su nastali tokom razvoja i testiranja:
- **211 Questions** (od kojih je samo 92 bilo validnih)
- **340 PredefinedAnswers** (od kojih je samo 109 bilo validnih)
- **5 QuestionnaireTypes** (uključujući testni tip koji je trebalo obrisati)
- **119 orphaned Questions** bez veze sa bilo kojim upitnikom

Dodatno, backend logika u `FlowController.SaveFlow` metodi nije pravilno čistila podatke pri update-u upitnika, što je vodilo akumulaciji orphaned zapisa.

## Rešenje

### 1. Database Cleanup

Izvršene su tri SQL skripte za čišćenje baze:

#### a) `25_Database_Cleanup.sql`
- Pokušaj brisanja Test Type-a (ID=5)
- Čišćenje broken SubQuestion linkova
- Iterativno brisanje orphaned pitanja

**Rezultat**: Delimično uspešno - Test Type nije obrisan zbog foreign key constraint-a.

#### b) `25_Database_Cleanup_v2.sql`
- Poboljšana verzija sa CASCADE logikom
- Korišćenje temp tabele za validaciju stabla pitanja
- Brisanje svih zavisnih podataka pre brisanja glavnih entiteta

**Rezultat**: Delimično uspešno - Test Type još uvek nije obrisan.

#### c) `26_Remove_Orphaned_Data.sql` + Manualni SQL komande
- Finalno čišćenje sa eksplicitnim brisanjem `QuestionnaireTypeReferenceTables`
- Korišćenje CTE za izgradnju validnog stabla pitanja
- Brisanje svih orphaned zapisa iz svih tabela

**Finalni rezultat**:
```
QuestionnaireTypes: 4 (bilo 5)
Questions: 92 (bilo 211, obrisano 119)
PredefinedAnswers: 109 (bilo 340, obrisano 231)
PredefinedAnswerSubQuestions: 65 (bilo 109, obrisano 44)
```

### 2. Backend Refactoring

Refaktorisana je `FlowController.SaveFlow` metoda da spreči buduće akumuliranje orphaned zapisa.

#### Izmene u `FlowController.cs`:

**a) Nova metoda: `DeleteQuestionnaireTypeDataAsync`**
```csharp
private async Task DeleteQuestionnaireTypeDataAsync(short questionnaireTypeId)
```
- Kompletno briše SVE podatke za dati QuestionnaireType
- Koristi CTE za izgradnju validnog stabla pitanja
- Briše podatke iz svih zavisnih tabela u pravilnom redosledu:
  1. QuestionnaireAnswers
  2. QuestionnaireByQuestionnaireIdentificators
  3. FlowLayouts
  4. Questionnaires (root mappings)
  5. QuestionReferenceColumns
  6. QuestionComputedConfigs
  7. PredefinedAnswerSubQuestions
  8. PredefinedAnswers
  9. Questions
  10. QuestionnaireTypeReferenceTables

**b) Refaktorisana `SaveFlow` logika:**
- Uklonjena logika za reuse postojećih Questions/Answers (existingQIds, existingAIds)
- Pri update-u: poziva `DeleteQuestionnaireTypeDataAsync` da obriše SVE stare podatke
- Uvek kreira NOVE entitete (Questions, PredefinedAnswers)
- Pojednostavljena logika - manje koda, manje grešaka

**c) Uklonjene metode:**
- `GetExistingGraphIds` - više nije potrebna jer ne radimo reuse entiteta

## Benefiti

1. **Čista baza**: Samo validni podaci, bez orphaned zapisa
2. **Predvidljivo ponašanje**: Update uvek kreira nove podatke, nema konfuzije oko reuse-a
3. **Lakše održavanje**: Jednostavnija logika, lakše razumevanje toka
4. **Sprečavanje budućih problema**: Automatsko čišćenje pri svakom update-u

## Testiranje

Nakon refaktorisanja, potrebno je testirati:
1. ✅ Kreiranje novog upitnika
2. ✅ Update postojećeg upitnika
3. ⏳ Brisanje upitnika (treba dodati endpoint)
4. ⏳ Provera da li se orphaned zapisi akumuliraju nakon više update-a

## Sledeći koraci (Part 1 - COMPLETE)

1. ✅ Dodati UNIQUE constraint na `QuestionnaireByQuestionnaireIdentificators(QuestionnaireTypeID, QuestionnaireIdentificatorID)`
2. ✅ Implementirati DELETE endpoint za brisanje celog QuestionnaireType-a
3. ⏳ Testirati frontend sa novom backend logikom
4. ⏳ Dokumentovati workflow za kreiranje/update/brisanje upitnika

## Update: Part 2 - Unique Constraint & Delete Endpoint

Implemented in `src/Backend/Wiwa.Admin.API/Controllers/FlowController.cs` and `docs/archive/root_dumps/27_Add_Unique_Constraint.sql`.

### 1. Unique Constraint
Added `UK_QuestionnaireByQuestionnaireIdentificators_Type_Identificator` to prevent duplicate mappings at the database level.

### 2. Delete Endpoint
Added `[HttpDelete("Delete/{questionnaireTypeId}")]` endpoint that reuses the robust `DeleteQuestionnaireTypeDataAsync` logic to safely remove an entire questionnaire type and all its dependencies.

## Fajlovi

- `docs/archive/root_dumps/25_Database_Cleanup.sql`
- `docs/archive/root_dumps/25_Database_Cleanup_v2.sql`
- `docs/archive/root_dumps/26_Remove_Orphaned_Data.sql`
- `src/Backend/Wiwa.Admin.API/Controllers/FlowController.cs` (refaktorisan)
