# ADR 0002: Temporary podcast page line-limit exception

Status: temporary exception  
Date: 2026-09-30  
Expires: 2026-10-31  
Owner: frontend lead

The repaired podcast page is 430 lines and exceeds the 400-line production
limit. Splitting it in the merge-conflict recovery change would combine
behavioral repair with a broader UI refactor.

The only approved exception is
`frontend/app/studio/podcast/page.tsx`. It must be split into workflow state,
input, segment selection, and output components before the expiry date.