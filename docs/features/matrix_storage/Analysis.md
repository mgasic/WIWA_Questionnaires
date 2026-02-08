---
description: BA-DBA Analiza za skladištenje matrice odlučivanja
---

# BA-DBA Analiza Sesija: Matrica Odlučivanja

## Svrha

Analiza i rešenje za prebacivanje "Mock" matrice odlučivanja (BuildingCategoryMatrix) u bazu podataka, i omogućavanje upravljanja ovom matricom putem API-ja.

## Format sesije

### 1. BA: Prezentacija zahteva

```markdown
## Zahtev: Dinamičko učitavanje Matrice Odlučivanja

### Klijent
Wiener Projekt - Upitnik Lokacije

### Opis
Trenutno se matrica za određivanje "Tipa konstrukcije" (BuildingCategoryMatrix) učitava iz hard-kodovanog JSON fajla (`BuildingCategoryMatrix_Injection.json`).
Klijenti će slati ovu matricu (ili njene parametre) kroz ulazni JSON ili API.
Potrebno je omogućiti da se ova matrica čuva u sistemu i automatski servira uz upitnik, umesto da se "lepi" iz fajla.

### Computed vrednosti
- [x] Da li postoje izračunljiva polja? Da, **ConstructionTypeID**.
- [x] Definisanje inputa i outputa:
    - Inputs: ExternalWallMaterialID, ConstructionMaterialID, RoofCoveringMaterialID
    - Output: ConstructionTypeID
- [x] Potrebne matrice/tabele: **BuildingCategoryMatrix**

### Pitanja (draft)
- Pitanje "Tip konstrukcije" zavisi od odgovora na 3 parent pitanja.

### Očekivani ishod
1.  API metoda za upload/update matrice za određeno pitanje/pravilo.
2.  Backend servira matricu iz baze (QuestionnaireSchemaDto).
3.  Frontend koristi matricu za automatsku selekciju (već implementirano, samo treba podaci da stignu).
4.  Uklanjanje hard-kodovanog fajla.
```

### 2. DBA: Validacija modela

```markdown
## Validacija: Skladištenje JSON matrice

### Trenutni Model (QuestionComputedConfigs)
Tabela `QuestionComputedConfigs` ima kolone:
- `QuestionComputedConfigID` (PK)
- `ComputeMethodID` (1 = Matrix, 2 = Formula?)
- `MatrixObjectName` (Ime tabele, npr 'BuildingCategoryMatrix')
- `MatrixOutputColumnName` (Output kolona)
- `FormulaExpression` (String, nullable) - **Kandidat za skladištenje JSON-a**

### Predlog
Umesto kreiranja nove tabele za svaku matricu (što zahteva DDL promene i komplikovano je za održavanje), iskoristićemo kolonu `FormulaExpression` (ili novu kolonu `ConfigJson`) u tabeli `QuestionComputedConfigs` za čuvanje serijalizovanog JSON-a matrice.

Razlog:
- Matrica je relativno mala (konfiguraciona).
- Struktura je fleksibilna.
- `ComputeMethodID` se može setovati na specifičnu vrednost (npr. ostaje 1 ili novi tip) da označi da se podaci čitaju iz JSON kolone, a ne iz fizičke tabele.

### Provera podataka
Treba proveriti da li je `FormulaExpression` dovoljno veliki (kompatibilnost sa nvarchar(max)). U EF modelu je string, pretpostavljamo nvarchar(max) ili dovoljno veliki length.

### Zaključak
Koristimo `QuestionComputedConfigs`.
- `ComputeMethodID` = 1 (Matrix Lookup)
- `MatrixObjectName` = 'VirtualMatrix' (ili null, ili ime matrice za binding)
- `FormulaExpression` = JSON sadržaj matrice.
```

### 3. Zajednički: Rešavanje gaps

```markdown
## Gaps i rešenja

### Gap 1: Kako razlikovati SQL tabelu od JSON matrice?
**Diskusija**: Trenutni kod (`EvaluateRuleAsync`) pokušava da uradi `SELECT * FROM [MatrixObjectName]`.
**Rešenje**: 
Implementiraćemo logiku:
Ako `FormulaExpression` počinje sa `{` (JSON objekat/niz) i `ComputeMethodID == 1`, onda parsiraj JSON.
Ili, čistije: Dodati flag ili koristiti konvenciju.
Najjednostavnije za sada: Ako je `FormulaExpression` popunjen, on ima prednost nad `MatrixObjectName` SQL lookup-om (ili se koristi kao izvor podataka).

Takođe, za Frontend, moramo tu matricu ubaciti u `schemaDto.Matrices`.

### Gap 2: API za azuriranje
**Rešenje**:
`POST /api/admin/computed-config/{id}/matrix`
Body: JSON matrice.
Akcija: Update `QuestionComputedConfigs` set `FormulaExpression` = @json WHERE `QuestionComputedConfigID` = @id.
```

### 4. Output

```markdown
## Finalna specifikacija

### Backend Changes
1.  **QuestionnaireService.cs**:
    -   U metodi `GetQuestionnaireSchemaAsync`:
        -   Učitati `QuestionComputedConfigs` za dati tip.
        -   Ako config ima popunjen `FormulaExpression` sa JSON matricom, deserijalizovati ga i dodati u `schemaDto.Matrices`.
        -   Ukloniti kod koji čita `BuildingCategoryMatrix_Injection.json`.
2.  **Admin API**:
    -   Novi kontroler/metoda za upload matrice.

### SQL Config Updates
-   Ažurirati postojeći red u `QuestionComputedConfigs` za "Upitnik Lokacije" (Type 1).
-   Setovati `FormulaExpression` na sadržaj JSON fajla.
```
