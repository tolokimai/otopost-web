# AI Governance & Integration Rules

## Core Principles
1. **Prompt as Code**:
   - All production prompts reside under the root `prompt/` directory.
   - Prompts are version-controlled markdown files. Inline prompt strings in Python code are forbidden.

2. **Model Parameter Centralization**:
   - Configured via environment and runtime settings:
     `AI_PROVIDER=gemini`
     `AI_MODEL=gemini-1.5-flash`
     `AI_TEMPERATURE=0.7`
     `AI_MAX_TOKENS=2048`

3. **Untrusted Model Output**:
   - All outputs from LLMs are parsed with strict schema validation before downstream consumption.
   - PII is masked or excluded where possible.

4. **Resource & Cost Quotas**:
   - Free and paid plans impose credit limits per action:
     - 10 credits per viral moment analysis
     - 5 credits per hooks/captions generation
     - 5 credits per carousel outline generation
     - 15 credits per video clipping / remake render
   - Credit deduction is atomic and verified before initiating heavy jobs.

