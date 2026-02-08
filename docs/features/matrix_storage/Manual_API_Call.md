# Manual API Call: Save Matrix

This guide explains how to manually update the decision matrix for a question using the new API endpoint.

## Endpoint Details

- **Method**: `POST`
- **URL**: `https://localhost:7195/api/Questionnaire/matrix/{questionId}` (or `http://localhost:5000/...`)
- **Headers**: 
    - `Content-Type: application/json`
    - `Accept: application/json`

## Example Payload (Building Category)

This payload corresponds to the "Construction Type" matrix (Question 1605).

```json
{
  "matrixName": "BuildingCategoryMatrix",
  "definition": {
    "keyColumns": [
      "ExternalWallMaterialID",
      "RoofCoveringMaterialID",
      "ConstructionMaterialID"
    ],
    "valueColumns": [
      "ConstructionTypeID"
    ]
  },
  "data": [
    { "ExternalWallMaterialID": 2, "RoofCoveringMaterialID": 1, "ConstructionMaterialID": 2, "ConstructionTypeID": 6 },
    { "ExternalWallMaterialID": 1, "RoofCoveringMaterialID": 2, "ConstructionMaterialID": 2, "ConstructionTypeID": 7 },
    { "ExternalWallMaterialID": 2, "RoofCoveringMaterialID": 2, "ConstructionMaterialID": 3, "ConstructionTypeID": 7 },
    { "ExternalWallMaterialID": 3, "RoofCoveringMaterialID": 1, "ConstructionMaterialID": 1, "ConstructionTypeID": 7 },
    { "ExternalWallMaterialID": 3, "RoofCoveringMaterialID": 1, "ConstructionMaterialID": 2, "ConstructionTypeID": 7 },
    { "ExternalWallMaterialID": 3, "RoofCoveringMaterialID": 2, "ConstructionMaterialID": 3, "ConstructionTypeID": 7 },
    { "ExternalWallMaterialID": 1, "RoofCoveringMaterialID": 1, "ConstructionMaterialID": 1, "ConstructionTypeID": 8 },
    { "ExternalWallMaterialID": 1, "RoofCoveringMaterialID": 1, "ConstructionMaterialID": 2, "ConstructionTypeID": 8 },
    { "ExternalWallMaterialID": 2, "RoofCoveringMaterialID": 1, "ConstructionMaterialID": 1, "ConstructionTypeID": 8 }
  ]
}
```

## Command Examples

### PowerShell (Invoke-RestMethod)

```powershell
$payload = @{
    matrixName = "BuildingCategoryMatrix"
    definition = @{
        keyColumns = @("ExternalWallMaterialID", "RoofCoveringMaterialID", "ConstructionMaterialID")
        valueColumns = @("ConstructionTypeID")
    }
    data = @(
        @{ ExternalWallMaterialID = 2; RoofCoveringMaterialID = 1; ConstructionMaterialID = 2; ConstructionTypeID = 6 },
        @{ ExternalWallMaterialID = 1; RoofCoveringMaterialID = 2; ConstructionMaterialID = 2; ConstructionTypeID = 7 },
        @{ ExternalWallMaterialID = 2; RoofCoveringMaterialID = 2; ConstructionMaterialID = 3; ConstructionTypeID = 7 },
        @{ ExternalWallMaterialID = 3; RoofCoveringMaterialID = 1; ConstructionMaterialID = 1; ConstructionTypeID = 7 },
        @{ ExternalWallMaterialID = 3; RoofCoveringMaterialID = 1; ConstructionMaterialID = 2; ConstructionTypeID = 7 },
        @{ ExternalWallMaterialID = 3; RoofCoveringMaterialID = 2; ConstructionMaterialID = 3; ConstructionTypeID = 7 },
        @{ ExternalWallMaterialID = 1; RoofCoveringMaterialID = 1; ConstructionMaterialID = 1; ConstructionTypeID = 8 },
        @{ ExternalWallMaterialID = 1; RoofCoveringMaterialID = 1; ConstructionMaterialID = 2; ConstructionTypeID = 8 },
        @{ ExternalWallMaterialID = 2; RoofCoveringMaterialID = 1; ConstructionMaterialID = 1; ConstructionTypeID = 8 }
    )
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Uri "https://localhost:7195/api/Questionnaire/matrix/1605" `
    -Method Post `
    -ContentType "application/json" `
    -Body $payload

# Note: Adjust URL port if needed (check dotnet run output)
```

### cURL

```bash
curl -X POST "https://localhost:7195/api/Questionnaire/matrix/1605" \
     -H "Content-Type: application/json" \
     -d '{
           "matrixName": "BuildingCategoryMatrix",
           "definition": {
             "keyColumns": ["ExternalWallMaterialID", "RoofCoveringMaterialID", "ConstructionMaterialID"],
             "valueColumns": ["ConstructionTypeID"]
           },
           "data": [
             { "ExternalWallMaterialID": 2, "RoofCoveringMaterialID": 1, "ConstructionMaterialID": 2, "ConstructionTypeID": 6 },
             { "ExternalWallMaterialID": 1, "RoofCoveringMaterialID": 2, "ConstructionMaterialID": 2, "ConstructionTypeID": 7 }
             // ... include rest of data ...
           ]
         }'
```
