-- Final Fix Configuration for Computed Questions (Types 1, 2, 3)
-- This script uses verified IDs found from the database.

-- Type 1: Question 1605 (Matrix)
-- Type 2: Question 595 (Formula, Inputs: 603, 604)
-- Type 3: Question 57  (Formula, Inputs: 58, 59)

-- 1. CLEANUP existing entries for these questions to avoid misconfiguration
DELETE FROM QuestionComputedConfigs WHERE QuestionID IN (1605, 595, 57);

-- 2. INSERT Type 1: Construction Category (MATRIX LOOKUP)
INSERT INTO QuestionComputedConfigs 
(QuestionID, ComputeMethodID, RuleName, MatrixObjectName, MatrixOutputColumnName, Priority, IsActive, FormulaExpression, OutputMode)
VALUES (1605, 1, 'Construction Category Matrix', 'BuildingCategoryMatrix', 'ConstructionTypeID', 1, 1, 
'{
    "matrixName": "BuildingCategoryMatrix",
    "definition": {
        "keyColumns": [ "ExternalWallMaterialID", "RoofCoveringMaterialID", "ConstructionMaterialID" ],
        "valueColumns": [ "ConstructionTypeID" ]
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
}', 1);



-- 3. INSERT Type 2: BMI Calculation Short (FORMULA)
-- Formula: {604} / (({603}/100.0) * ({603}/100.0))
INSERT INTO QuestionComputedConfigs 
(QuestionID, ComputeMethodID, RuleName, MatrixObjectName, MatrixOutputColumnName, Priority, IsActive, FormulaExpression, OutputMode)
VALUES (595, 2, 'BMI Calculation (Short)', '', '', 2, 1, '{604} / (({603} / 100.0) * ({603} / 100.0))', 1);


-- 4. INSERT Type 3: BMI Calculation Large (FORMULA)
-- Formula: {59} / (({58}/100.0) * ({58}/100.0))
INSERT INTO QuestionComputedConfigs 
(QuestionID, ComputeMethodID, RuleName, MatrixObjectName, MatrixOutputColumnName, Priority, IsActive, FormulaExpression, OutputMode)
VALUES (57, 2, 'BMI Calculation (Large)', '', '', 2, 1, '{59} / (({58} / 100.0) * ({58} / 100.0))', 1);


-- VERIFICATION
PRINT 'Configuration updated successfully.';
SELECT cm.Name as Method, qcc.QuestionID, qcc.RuleName, qcc.FormulaExpression 
FROM QuestionComputedConfigs qcc
JOIN ComputeMethods cm ON qcc.ComputeMethodID = cm.ComputeMethodID
WHERE qcc.QuestionID IN (1605, 595, 57);

