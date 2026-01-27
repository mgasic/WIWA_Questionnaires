# Lesson Learned: Database & Integration Issues

## 1. Character Encoding (Mojibake)
**Issue**: Inserting text with special characters (e.g., `č`, `ć`, `ž`, `š`) into `NVARCHAR` columns using standard `INSERT INTO ... VALUES ('Težina')` resulted in corrupted characters (`TeÅ_ina`).
**Root Cause**: SQL Server treats string literals as non-Unicode (VARCHAR) by default unless prefixed. If the database collation or connection encoding doesn't match, characters are lost.
**Solution**: ALWAYS use the `N` prefix for string literals.
```sql
-- INCORRECT
INSERT INTO Questions (Text) VALUES ('Težina');

-- CORRECT
INSERT INTO Questions (Text) VALUES (N'Težina');
```

## 2. Identity Insert Failures
**Issue**: Attempting to insert explicit IDs into a table with `IDENTITY` property enabled generally fails unless `SET IDENTITY_INSERT TableName ON` is used. However, mistakenly assuming a table *has* identity when it doesn't (or vice versa) leads to confusion.
**Specific Failure**: We missed that `QuestionFormats` has an IDENTITY column, and also missed a non-nullable `Code` column.
**Lesson**:
1. Check table definition (`sp_help` or `INFORMATION_SCHEMA`) before writing custom insert scripts.
2. When inserting configuration/lookup data (like formats), ensure all non-nullable columns are provided.
3. Be explicit with column lists in `INSERT` statements. `INSERT INTO Table DEFAULT VALUES` or `INSERT INTO Table VALUES (...)` is risky. Always use `INSERT INTO Table (Col1, Col2) VALUES (Val1, Val2)`.

## 3. Deployment Script Idempotency
**Issue**: Running scripts multiple times caused partial failures where parent records were deleted but children remained (or formats missing), breaking foreign keys on re-insert.
**Solution**: Always wipe related tables in correct dependency order (Leaf -> Root) before re-populating.
```sql
DELETE FROM LeafTable;
DELETE FROM MiddleTable;
DELETE FROM RootTable;
```
Ensure the script transaction covers the entire reset-and-repopulate cycle if possible, or use defensive checks (`IF NOT EXISTS`).
