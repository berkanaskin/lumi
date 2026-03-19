---
phase: 02-hybrid-ai-search
plan: 01b
type: execute
wave: 1
depends_on: [02-01]
files_modified: [src/config.js, src/services/api.js]
autonomous: true
requirements: [PLAT-04]
must_haves:
  truths:
    - "OpenAI API key is configured and accessible to Edge Functions"
    - "Embedding configuration constants are centralized in config.js"
    - "Cost tracking constants are configured and documented"
    - "API service layer has methods to call embedding endpoints"
    - "Search history queries are logged silently for personalization"
  artifacts:
    - path: "src/config.js"
      provides: "Centralized OpenAI and embedding configuration with cost constants"
      exports: ["OPENAI_API_KEY", "EMBEDDING_CONFIG", "COST_CONFIG"]
    - path: "src/services/api.js"
      provides: "Extended API service with generateEmbeddings() and logMetric() methods"
      exports: ["generateEmbeddings()", "logMetric()"]
  key_links:
    - from: "src/config.js"
      to: "api/embeddings.js"
      via: "EMBEDDING_CONFIG and COST_CONFIG imported and used"
      pattern: "EMBEDDING_CONFIG.*COST_CONFIG"
    - from: "src/services/api.js"
      to: "api/embeddings.js"
      via: "generateEmbeddings() calls /api/embeddings endpoint"
      pattern: "fetch.*api/embeddings"
---

<objective>
Configure the embedding infrastructure and extend the API service layer with metric logging. This plan sets up environment configuration, cost tracking constants, and service methods for API interaction.

Purpose: Centralize configuration for embedding operations and provide a clean API interface for other features to log search history and trigger retraining.
Output: Configured environment variables, centralized constants, extended API service methods.
</objective>

<execution_context>
@/c/Users/berka/.gemini/antigravity/projects/lumi/.planning/phases/02-hybrid-ai-search/02-CONTEXT.md
@/c/Users/berka/.gemini/antigravity/projects/lumi/.planning/phases/02-hybrid-ai-search/02-RESEARCH.md
</execution_context>

<context>
@/c/Users/berka/.gemini/antigravity/projects/lumi/.planning/phases/02-hybrid-ai-search/02-01-SUMMARY.md (Plan 01 output: embedding infrastructure complete)
@/c/Users/berka/.gemini/antigravity/projects/lumi/src/config.js (current configuration)
@/c/Users/berka/.gemini/antigravity/projects/lumi/src/services/api.js (existing API service)
@/c/Users/berka/.gemini/antigravity/projects/lumi/.env.example (if exists, environment variable documentation)

### Key Dependencies

Plan 01 must be complete:
- api/embeddings.js created and ready to deploy
- src/lib/embeddings.js with utility functions ready
- package.json has ai and @ai-sdk/openai installed

From 02-CONTEXT.md: Search history saved silently (no user UI) for personalization enrichment. Cost tracking via api_metrics collection for monitoring spending.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update config.js with OpenAI and embedding configuration</name>
  <files>src/config.js</files>
  <read_first>src/config.js (current environment variable pattern), .env.example (if exists)</read_first>
  <action>
    Add OpenAI and embedding configuration to `src/config.js`:

    1. Add OPENAI_API_KEY:
       - Source: process.env.OPENAI_API_KEY (server-side only)
       - Used by api/embeddings.js
       - Must be provided in Vercel environment

    2. Add embedding configuration constants:
       - EMBEDDING_MODEL: 'text-embedding-3-small'
       - EMBEDDING_DIMENSIONS: 512 (reduced from 1536 for cost savings)
       - EMBEDDING_BATCH_SIZE: 50
       - EMBEDDING_CONFIDENCE_THRESHOLD: 0.75 (for LLM fallback decision)

    3. Add cost constants:
       - EMBEDDING_COST_PER_1M_TOKENS: 0.02
       - LLM_COST_PER_1M_TOKENS: 0.15
       - MONTHLY_BUDGET_ALERT: 50

    Example pattern (following existing config):
    ```javascript
    // OpenAI Configuration (server-side, via Vercel env)
    export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

    // Embedding Configuration
    export const EMBEDDING_CONFIG = {
      model: 'text-embedding-3-small',
      dimensions: 512,
      batchSize: 50,
      confidenceThreshold: 0.75,
    };

    // Cost Monitoring
    export const COST_CONFIG = {
      embeddingCostPer1M: 0.02,  // $/1M tokens
      llmCostPer1M: 0.15,         // $/1M tokens
      monthlyBudgetAlert: 50,     // Alert if > $50/month
    };
    ```

    Document in README that OPENAI_API_KEY must be set in Vercel environment variables for production.
  </action>
  <verify>
    - Run: `grep -q "OPENAI_API_KEY" src/config.js && echo "PASS"` — API key imported
    - Run: `grep -q "EMBEDDING_CONFIG" src/config.js && echo "PASS"` — embedding config added
    - Run: `grep -q "COST_CONFIG" src/config.js && echo "PASS"` — cost config added
    - Run: `grep -q "512" src/config.js && echo "PASS"` — embedding dimension set correctly
    - No syntax errors: `node -c src/config.js`
  </verify>
  <acceptance_criteria>
    - OPENAI_API_KEY exported from config (from process.env)
    - EMBEDDING_CONFIG includes model, dimensions, batch size, threshold
    - COST_CONFIG includes pricing constants
    - All values match research recommendations (512 dims, 0.75 threshold, 0.02/0.15 costs)
    - Config is properly exported for use by api/embeddings.js and other modules
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Extend API service with embedding and metric logging methods</name>
  <files>src/services/api.js</files>
  <read_first>src/services/api.js (current API service structure), src/config.js (API_URLS configuration), api/embeddings.js (endpoint details)</read_first>
  <action>
    Extend `src/services/api.js` with two new methods for the embedding infrastructure. Add to existing TMDBService class or create separate EmbeddingService:

    1. `async generateEmbeddings(limit = 50, version = 'v1')`
       - POST to `/api/embeddings` with {limit, version}
       - Returns: {processed, embeddings_generated, newVersion}
       - Used by admin tools to trigger batch generation

    2. `async logMetric(metric)`
       - POST to `/api/metrics` with metric object
       - Writes to Firestore api_metrics collection
       - Used after each search to track costs
       - Metric object structure: {type, timestamp, query, resultCount, confidence, etc}

    Implementation pattern (extend existing service):
    ```javascript
    // In existing TMDBService or new EmbeddingService class
    async generateEmbeddings(limit = 50, version = 'v1') {
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit, version }),
      });
      if (!response.ok) throw new Error('Embedding generation failed');
      return response.json();
    }

    async logMetric(metric) {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      });
      return response.ok;
    }
    ```

    Export these methods so Plan 02 can call them from search endpoint and Plan 03 can call them from UI:
    ```javascript
    export const EmbeddingService = {
      generateEmbeddings: TMDBService.generateEmbeddings.bind(TMDBService),
      logMetric: TMDBService.logMetric.bind(TMDBService),
    };
    ```

    Or add to existing export if TMDBService is already exported.
  </action>
  <verify>
    - Run: `grep -q "generateEmbeddings" src/services/api.js && echo "PASS"` — method exists
    - Run: `grep -q "logMetric" src/services/api.js && echo "PASS"` — method exists
    - Run: `grep -q "/api/embeddings" src/services/api.js && echo "PASS"` — endpoint referenced
    - Run: `grep -q "/api/metrics" src/services/api.js && echo "PASS"` — metrics endpoint referenced
    - No syntax errors: `node -c src/services/api.js`
  </verify>
  <acceptance_criteria>
    - Two new async methods added to API service layer
    - generateEmbeddings() calls /api/embeddings with limit and version
    - logMetric() calls /api/metrics with metric object
    - Both methods properly handle responses and errors
    - Methods are exported for use by downstream code (Plan 02, Plan 03)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Add silent search history logging infrastructure</name>
  <files>src/services/api.js</files>
  <read_first>src/services/api.js (where to add), src/lib/state.js (user context), src/config.js (API endpoints)</read_first>
  <action>
    Add a silent search history logging method to API service. This implements the decision from 02-CONTEXT.md: "Search history saved silently for personalization — not displayed to user".

    1. Add `async logSearchQuery(query, userId, resultsCount)` method:
       - POSTs to `/api/search-history` with {query, userId, resultsCount, timestamp}
       - Does NOT throw on failure (silent logging — never blocks user flow)
       - Used by Plan 03 search UI to log each query for personalization
       - Returns success/failure silently (log to console only)

    Implementation:
    ```javascript
    async logSearchQuery(query, userId, resultsCount = 0) {
      try {
        const response = await fetch('/api/search-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            userId,
            resultsCount,
            timestamp: new Date(),
          }),
        });
        if (!response.ok) {
          console.warn('Failed to log search history');
        }
      } catch (error) {
        console.warn('Search history logging error:', error);
        // Silently fail — don't disrupt user experience
      }
    }
    ```

    2. Document in comments:
       - Silent logging — failures don't affect user experience
       - Used for personalization enrichment in future phases
       - Privacy: Only logged for authenticated users
       - No sensitive data logged — only query text and result count

    Export this method so Plan 03 can call it after each search.
  </action>
  <verify>
    - Run: `grep -q "logSearchQuery" src/services/api.js && echo "PASS"` — method exists
    - Run: `grep -q "/api/search-history" src/services/api.js && echo "PASS"` — endpoint referenced
    - Run: `grep -q "try.*catch" src/services/api.js && grep -A5 "logSearchQuery"` — error handling present
    - No syntax errors: `node -c src/services/api.js`
  </verify>
  <acceptance_criteria>
    - Method added: async logSearchQuery(query, userId, resultsCount)
    - POSTs to /api/search-history with {query, userId, resultsCount, timestamp}
    - Gracefully handles errors (try/catch, console.warn only)
    - Does not throw or block on failure (silent)
    - Includes comment explaining silent logging and privacy
    - Exported for use by Plan 03 search UI
  </acceptance_criteria>
</task>

</tasks>

<verification>
## Configuration Validation

After all tasks complete:

1. **Configuration complete:**
   - Run: `node -c src/config.js` (no syntax errors)
   - OPENAI_API_KEY exported (from process.env)
   - EMBEDDING_CONFIG exported with correct values
   - COST_CONFIG exported with pricing constants

2. **API service extended:**
   - Run: `node -c src/services/api.js` (no syntax errors)
   - Contains generateEmbeddings() method
   - Contains logMetric() method
   - Contains logSearchQuery() method
   - All three methods exported

3. **Error handling:**
   - logMetric() and logSearchQuery() handle errors gracefully
   - Silent failures in search history logging won't break UI

## Integration Readiness

Plan 01b is complete when:
- src/config.js has OPENAI_API_KEY, EMBEDDING_CONFIG, COST_CONFIG
- src/services/api.js has generateEmbeddings(), logMetric(), logSearchQuery()
- All methods properly handle errors
- Configuration is ready for Plan 02 to use

</verification>

<success_criteria>
Phase 2 Plan 01b is complete when:
- [ ] src/config.js exports OPENAI_API_KEY from process.env
- [ ] EMBEDDING_CONFIG includes model, dimensions, batch size, threshold
- [ ] COST_CONFIG includes pricing constants ($0.02, $0.15, $50)
- [ ] src/services/api.js has generateEmbeddings() method
- [ ] src/services/api.js has logMetric() method
- [ ] src/services/api.js has logSearchQuery() method (silent logging)
- [ ] All methods properly handle errors
- [ ] All files have no syntax errors
- [ ] README documents OPENAI_API_KEY requirement for Vercel
</success_criteria>

<output>
After completion, create `.planning/phases/02-hybrid-ai-search/02-01b-SUMMARY.md`

Include:
- Duration of execution
- Configuration constants verified
- API service methods tested
- Search history logging working silently (no errors in console)
- Ready state for Plan 02 (configuration and service layer complete)
</output>
