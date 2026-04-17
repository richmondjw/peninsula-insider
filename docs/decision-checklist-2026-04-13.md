# Peninsula Insider — Decision Checklist

**Date:** 13 April 2026  
**Purpose:** Turn current platform decisions into an action-oriented approval matrix.

---

## Approve now

### 1. Cloudflare fronting the site
**Decision:** Approve now  
**Why:** highest-ROI hardening move, low implementation risk if verified carefully

### 2. robots.txt and terms layer
**Decision:** Approve now  
**Why:** easy, low-cost, aligns with anti-scraping posture immediately

### 3. Search Phase A = Pagefind
**Decision:** Approve now  
**Why:** best fit for current Astro + GitHub Pages architecture

### 4. Search Phase B = MiniSearch
**Decision:** Approve now as the planned second stage  
**Why:** strongest fit for structured discovery over venues/places/experiences

### 5. Web concierge before native app
**Decision:** Approve now  
**Why:** right product sequence, avoids premature native complexity

### 6. PWA before app-store packaging
**Decision:** Approve now  
**Why:** lowest-friction app-like path

---

## Investigate / design next

### 1. Search UI form
Need to decide:
- global search modal
- dedicated `/search` page
- or phased rollout of both

### 2. Concierge architecture
Need to define:
- retrieval layer
- grounding rules
- confidence/uncertainty handling
- scope of first use cases

### 3. Structured metadata normalisation
Need to decide standard vocabularies for:
- mood
- audience
- zone
- season
- price band
- authority signals

### 4. Future gating model
Need to design what remains public vs what becomes mediated/gated later.

---

## Defer

### 1. Full native app build
Defer until the web concierge and installable experience have proven value.

### 2. React Native rewrite
Defer / reject for now.

### 3. Heavy hosted search infra
Defer until scale justifies it.

### 4. Overengineered anti-scraping stack
Defer. Use friction and moat-building first.

### 5. Apple App Store push in current form
Defer until the product has deeper, clearly differentiated utility.
