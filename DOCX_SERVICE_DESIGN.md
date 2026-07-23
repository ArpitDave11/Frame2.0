# Docx Service + Epic/Issue KB — Architecture Recommendation

**Status:** Design recommendation. NO code changes. No stack constraints.
**Date:** 2026-05-29
**Premise (from you):** Two bounded domains on one platform:
1. **Epic/Issue generation** — already implemented in the Frame modeling system; keep it as its own service layer with its own Epic-optimized KB. Scoped to GitLab Groups → Subgroups → Projects → Epics/Issues.
2. **Docx** — NEW, standalone document-intelligence service with its OWN isolated KB. Lightweight, scalable, performant. Graph-based understanding + node-graph contextual linking/traversal + embeddings. Session-based uploads that can be promoted to a persistent org KB.

---

## 1. Service & KB separation — recommendation: **separate service + separate data store + shared platform**

| Concern | Recommendation |
|---|---|
| **Service boundary** | Docx = its own standalone microservice (own FastAPI app, own deploy, own scaling), following the Frame_4 skeleton (gateway in front, shared lib, FastMCP, worker). |
| **Data isolation** | **Physical** — Docx gets its OWN database/instance, *separate from the Epic KB*. Don't share the graph store between domains. |
| **What's shared** | Only platform primitives: the **gateway (MSAL→JWT)**, shared library (config/logging/JWT), observability (Langfuse), AKS cluster, CI. |
| **Why physical, not just logical** | You explicitly want Docx "not tightly coupled," "standalone," "independently scalable." Separate stores = independent failure domains, no schema/query contention, no accidental coupling, and Docx can scale on document/session load while Epic scales on generation load. The cost (an extra store to operate) is worth the clean boundary — and it's a one-time setup, not ongoing friction. |

**Net:** *Architecturally + physically separated services and stores; logically unified only at the gateway/auth/observability layer.* This is the cleanest long-term shape — two bounded contexts (DDD), one platform.

There are then **three distinct knowledge bases**, never mixed:
- **Epic/Issue KB** (org/project, persistent) — for grounding epic/issue generation.
- **Docx persistent org KB** (promoted documents) — durable document intelligence graph.
- **Docx session KB** (ephemeral) — live uploads during a working session.

---

## 2. Graph storage: SurrealDB vs Neo4j — honest verdict

**Short answer: for Docx specifically, SurrealDB is the cleaner fit; for the Epic/Issue KB, keep Neo4j.**

### Why SurrealDB for Docx
Docx's stated goals — *lightweight, standalone, performant, graph + contextual linking + embeddings in one* — map almost exactly onto SurrealDB's multi-model design:
- **One engine does vector ANN + BM25 full-text + graph traversal + document storage, in a single query.** That is exactly the modern retrieval core (hybrid + graph) — but with **one** store instead of stitching a graph DB + a vector DB + a BM25 index together. For a service whose whole point is to stay lightweight and standalone, collapsing 3 stores into 1 is a real architectural win.
- **Continuously-updated graphs + horizontal read/write scaling** fit session-based continuous indexing (Neo4j Community is single-write-leader; clustering is Enterprise).
- **Native namespace/database multi-tenancy** maps cleanly to per-org / per-session isolation.
- Reinforces the isolation from the Neo4j-based Epic stack (different engine = no accidental coupling).

### Why keep Neo4j for the Epic/Issue KB
- It's **already there and working** — don't rewrite a functioning system.
- The **GraphRAG/library ecosystem (Cognee, LightRAG, Graphiti, GDS graph algorithms) targets Neo4j**, and Epic *traceability* (requirement → epic → issue → component) is a deep-traversal / graph-algorithm workload where Neo4j's maturity shines.

### The honest caveats on SurrealDB (eyes open)
- **Younger / less battle-tested** than Neo4j for very deep multi-hop traversal + graph algorithms at massive scale. Fine at moderate scale (where Docx starts); validate before betting on extreme scale. (Several "scales horizontally for writes" claims are vendor-stated — benchmark on your data.)
- **Thinner ecosystem:** you'll build Docx's ingestion + graph-extraction pipeline yourself (you can't lean on Cognee/LightRAG, which target Neo4j). *But* "OpenNode-style contextual linking" is your bespoke concept and the modern retrieval core (hybrid+rerank+agentic) is custom anyway — so you lose little by going custom on SurrealDB.
- No GDS-equivalent rich graph-algorithm library.

### The decision, framed
| Priority | Choose |
|---|---|
| Lightweight, standalone, single-engine (graph+vector+BM25+doc in one), clean isolation from Epic stack, moderate→large scale | **SurrealDB (Docx)** ← my recommendation |
| One graph technology org-wide, max graph maturity/ecosystem, deep multi-hop + graph algorithms, lowest risk | **Neo4j (separate database for Docx)** ← the conservative alternative |

**My recommendation:** **SurrealDB for Docx, Neo4j for Epic/Issue.** It gives Docx the lightweight single-engine profile you asked for and a clean physical boundary. The price is running two graph technologies — acceptable because each fits its domain and they're fully isolated. If you'd rather minimize tech diversity (easier hiring/ops, one query language), the equally-valid fallback is **all-Neo4j with a separate Neo4j database per domain** — you keep maturity/ecosystem at the cost of stitching vector+BM25 around Neo4j and accepting its write-leader model.

*(Either way, the retrieval **pattern** is the same: hybrid vector+BM25 + rerank + graph traversal + adaptive routing — see §5.)*

---

## 3. Docx internal architecture

```
gateway (MSAL→JWT) ──▶ docx-service (FastAPI; FRAME_ROLE=api|worker; LangGraph; FastMCP)
   │
   ├─ INGEST (session, LIGHTWEIGHT & fast):
   │    Docling extract → contextual/late chunking → embed → index into
   │    SurrealDB session namespace (vector + BM25 + chunk↔doc links).
   │    NO heavy entity/relationship graph extraction here (keep sessions cheap/fast).
   │
   ├─ INGEST (promotion, HEAVY, async worker):
   │    re-scope session docs → org namespace → LLM entity/relationship extraction →
   │    build node-graph (documents, sections, chunks, entities, relations) →
   │    contextual linking → embed → persistent hybrid+graph index.
   │
   ├─ RETRIEVE (adaptive, via LangGraph):
   │    query → router ─┬ simple → hybrid (vector+BM25, RRF) → rerank → answer+citations
   │                    ├ multi-hop/structural → graph traversal (OpenNode linking) + hybrid
   │                    └ complex → decompose → multi-step retrieve → verify (cap 3)
   │
   └─ TOOLS (FastMCP, per-tenant scoped): search_corpus, traverse_links, get_chunk,
        get_document_structure, find_related   (+ external MCP edge for Copilot)

   Store: SurrealDB (Docx) — namespaces: org:{org_id}, session:{session_id}
   Observability: Langfuse   Eval: Ragas in CI
```

**Graph model (the "node-graph" for contextual linking/traversal):**
`Document → HAS_SECTION → Section → HAS_CHUNK → Chunk` (chunks carry embeddings + BM25);
`Chunk/Section → MENTIONS → Entity`; `Entity → RELATED_TO → Entity` (typed, weighted, LLM-extracted);
`Document → REFERENCES → Document` (cross-doc links). Every node tagged with scope (`org`/`session`) + tenant. This is what enables "open, traversable contextual linking": start at a hit, walk relationships to assemble cross-document context.

---

## 4. Session-based memory & promotion — refined design

Your instinct (temporary store, promote to persistent) is right. Refinements:

### Session knowledge base
- A **session = a scoped namespace** (`session:{id}`) in Docx's store — *not* a separate throwaway DB. Cheaper, and promotion becomes a re-scope, not a re-ingest.
- On upload: **lightweight indexing only** — Docling → contextual chunk → embed → vector + BM25 + chunk/doc links. Immediate hybrid retrieval for live chat/search. **Defer expensive entity-graph extraction to promotion** — this is the key to keeping Docx fast/lightweight per session.
- **Lifecycle (better than a flat 30 min):** *sliding* TTL refreshed on activity + a hard max (e.g., idle 30 min OR hard cap a few hours), plus explicit **End session** / **Discard**. A background sweeper purges expired session namespaces (SurrealDB record-level expiry or a scheduled cleanup job). Surface a "your session expires in N min — promote to keep" nudge.
- **Why not just 30 min flat:** users mid-analysis get cut off; a sliding idle timeout + explicit promote/discard is friendlier and equally cheap.

### Promotion workflow (session → persistent org KB)
Explicit user action → async worker job:
1. **Re-scope** the chosen docs/chunks/embeddings from `session:{id}` → `org:{org_id}` (metadata change, no re-embed — embeddings already exist).
2. **Run the heavy graph enrichment now:** LLM entity/relationship extraction → build the node-graph + contextual links → community/structure. (This is the work you skipped for the cheap session path.)
3. **Dedup** by document hash (don't double-ingest the same doc across sessions).
4. **Provenance:** record promoter (Entra identity), timestamp, source session, doc hashes — for audit + governance.
5. Persistent index now serves hybrid + graph retrieval for the org.
- **Partial promotion:** let the user promote selected documents, not only whole sessions.

### Why this split is the cleanest
- **Cost & latency:** ephemeral sessions stay cheap (no per-upload LLM graph extraction); you pay the expensive graph build once, only for knowledge worth keeping.
- **Performance:** session chat is fast (vector+BM25 only); persistent KB is rich (full graph).
- **Clean lifecycle:** ephemeral data auto-expires; persistent data is deliberate, attributed, deduped.

---

## 5. Retrieval architecture (both KBs use the same pattern)
- **Core:** hybrid (dense vector + BM25) + **reranker** + **contextual chunking** at ingest. (Highest-ROI, evidence-backed — see `BEST_ARCHITECTURE_DESIGN.md`.)
- **Graph layer:** traversal for multi-hop / cross-document / structural questions (Docx: contextual linking; Epic: traceability). In SurrealDB this is one query alongside vector+BM25; in Neo4j it's MATCH + vector SEARCH.
- **Adaptive/agentic routing (LangGraph):** simple lookups → cheap hybrid path; complex → decompose-retrieve-verify (cap cycles at 3 → low-confidence answer). Every answer carries **citations + a faithfulness check**.
- **Embeddings:** text-embedding-3-large or Cohere v4 @ 768–1024 dims (Azure-native), shared model per index; BGE-M3 for offline. **Reranker:** Cohere Rerank 4 (Azure Foundry) or BGE-v2-m3 (offline).
- **Eval:** Ragas (faithfulness, context recall) gated in CI per KB.

---

## 6. Epic/Issue KB (separate, optimized for generation)
- **Tenancy = the GitLab hierarchy:** scope every record by Group / Subgroup / Project. Retrieval for an epic/issue is scoped to its project (with optional roll-up to group for org standards).
- **Graph (Neo4j):** Epic → Issue → Requirement → Component traceability + links to source docs/standards; vector similarity to *past* epics/issues for few-shot grounding.
- **Retrieval for generation:** hybrid (find similar past work + relevant standards/templates) + graph traversal (traceability/coverage checks) feeding the existing epic/issue generation pipeline.
- **Keep the existing service** — just ensure it's a clean separate service + KB from Docx, sharing only gateway/auth/observability.
- **Optional bridge (later):** a *promoted* Docx document could be linked into the Epic KB as a grounding source for a specific project — a deliberate, governed cross-link, not shared storage.

---

## 7. Long-term maintainability & performance
- **Bounded contexts:** Epic domain and Docx domain evolve independently (separate services, stores, schemas, deploys).
- **Independent scaling:** Docx scales on upload/session/query load; Epic on generation load; sessions are cheap by design.
- **Shared platform** (gateway/auth/shared-lib/observability/CI) avoids duplication without coupling the domains.
- **Ephemeral-light / persistent-heavy** keeps token cost + latency down and makes the expensive graph build intentional.
- **Eval-gated retrieval** (Ragas in CI) so quality is measured, not assumed — and so you know *if/when* the graph layer is actually pulling its weight.
- **Main maintainability cost:** two graph technologies (SurrealDB + Neo4j). Accept it for domain-fit + isolation, or unify on Neo4j (separate DBs) if you prefer one tech. Either is defensible; pick based on team/ops appetite.

---

## 8. Summary of recommendations
| Question | Recommendation |
|---|---|
| Service separation | Docx = standalone microservice; Epic/Issue = its own service; share only gateway/auth/observability. |
| KB isolation | 3 isolated KBs (Epic, Docx-persistent, Docx-session); **physical** store separation between Docx and Epic. |
| Session memory | Session = scoped namespace, **lightweight indexing only**, sliding TTL + explicit promote/discard, background sweeper. |
| Promotion | Explicit (whole-session or per-doc) → async re-scope (no re-embed) + **heavy graph enrichment** + dedup + provenance. |
| Graph store (Docx) | **SurrealDB** (multi-model single-engine = lightweight/standalone fit) — or all-Neo4j (separate DB) if you want one tech org-wide. |
| Graph store (Epic) | **Neo4j** (keep existing; ecosystem + traceability traversal). |
| Retrieval | Hybrid (vector+BM25) + rerank + contextual chunking + adaptive/agentic routing + citations; graph traversal for multi-hop. |
| Maintainability | Bounded contexts, independent scaling, shared platform only, eval-gated quality. |

---

## 9. Questions that refine the final picks
1. **Docx scale target** (docs/tenants/sessions, peak concurrent) — confirms SurrealDB-vs-Neo4j risk and whether SurrealDB clustering is needed.
2. **Offline/air-gapped tenants for Docx?** (affects embeddings/reranker: Azure-managed vs self-hosted BGE.)
3. **One graph technology org-wide, or best-fit-per-domain?** (the SurrealDB+Neo4j vs all-Neo4j call.)
4. **Session semantics:** single-user sessions, or shared/collaborative? Expected session size (docs/MB)?
5. **Does a promoted Docx doc need to feed the Epic KB** (cross-domain grounding), or stay fully separate?
6. **Build Docx fresh** on the Frame_4 skeleton, or fork from DocEX's LangGraph chat/ask logic as a starting point?

*Recorded in CONVERSATION_CONTEXT.md. No implementation until approved.*
