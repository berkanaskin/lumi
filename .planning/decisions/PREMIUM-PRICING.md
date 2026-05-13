# Lumi Premium — Pricing & Launch Decisions (LOCKED)

**Date locked:** 2026-05-13
**Owners:** Berkan + Claude
**Reference for:** Phase 5 (Premium Agent) + Phase 6 (iOS+Android Launch)

This document captures every pricing, market, and platform decision locked on 2026-05-13. Treat as the source of truth — no Phase 5 or Phase 6 plan may diverge from this without writing a follow-up decision doc here.

---

## 1. Premium Tier Structure

| Tier         | US$    | TR        | Free Trial | Notes                                              |
| ------------ | ------ | --------- | ---------- | -------------------------------------------------- |
| **Monthly**  | $2.99  | 49 ₺      | 7 days     | Auto-renewable subscription                        |
| **Annual**   | $19.99 | 299 ₺     | 7 days     | Auto-renewable subscription; "Best Value"          |
| **Lifetime** | $49.99 | 799 ₺     | **None**   | One-time purchase, **LIMITED launch offer** — see §5 |

Yearly savings versus monthly (US): `($2.99 × 12) − $19.99 = $15.89/year saved`.
TR yearly savings: `(49 × 12) − 299 = 289 ₺/year saved`.

---

## 2. Turkey PPP (Purchasing-Power Parity)

- **Custom localized pricing**, NOT Apple's / Google's default PPP tier mapping.
  - Default PPP would map US $2.99 → ~99 TL, $19.99 → ~599 TL, $49.99 → ~1499 TL.
  - That's too expensive for the TR market and would crush conversion.
- **Final TR pricing**: 49 / 299 / 799 TL (~50% of US$ equivalent at current FX).
- TR custom pricing must be set manually in App Store Connect (Custom Price Tier) and Play Console (per-country price override) at IAP setup time (Phase 6).

### Other PPP markets

These markets use a **~50% scaling rule** versus the US$ price, but the exact mapping is calculated at App Store Connect / Play Console setup time using the `asc-ppp-pricing` skill (so we use the nearest legal price tier per platform):

- IN (India)
- BR (Brazil)
- MX (Mexico)
- ID (Indonesia)
- AR (Argentina)
- EG (Egypt)
- PH (Philippines)
- VN (Vietnam)

All other markets use the **default Apple / Google tier mapping** from the US$ price.

---

## 3. Launch Markets

Decided 2026-05-10, confirmed 2026-05-13.

**Primary launch markets** (Phase 6, day-1):
- TR — Turkey (custom PPP)
- US — United States
- UK — United Kingdom
- CA — Canada
- AU — Australia

**Secondary launch markets** (Phase 6, day-1 or day-30):
- DE — Germany
- FR — France
- ES — Spain
- IT — Italy
- JP — Japan
- KR — South Korea

TR uses custom PPP. All other launch markets use default tier mapping from the US$ price.

---

## 4. Payment Platforms

| Platform     | Payment system                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| iOS          | **StoreKit IAP** — auto-renewable subscriptions (monthly + yearly), non-consumable IAP (lifetime)           |
| Android      | **Google Play Billing** — subscription products (monthly + yearly), one-time product (lifetime)             |
| Unified by   | **RevenueCat** — single entitlement `premium`, receipt validation, cross-platform sync, intro-offer plumbing |

### NO web payment

- Lumi is launching as a **native mobile-only** product.
- The web codebase remains **dev/test only** — production = iOS + Android Capacitor wrappers.
- Web users see a **"iOS/Android app'imizde Premium'a yükselt"** CTA that links to the App Store + Play Store listings.
- Until Phase 6 wraps the app in Capacitor, the in-app paywall is a **mock** (no real purchase flow).

---

## 5. Lifetime Tier — Limited Launch Offer

- **Cap**: Archive the lifetime product when **either** condition fires first:
  1. First **1000** lifetime purchases hit (tracked in RevenueCat dashboard).
  2. **90 days** after Phase 6 public launch elapse.
- Tracking happens in the RevenueCat dashboard (count of non-consumable transactions on the lifetime product).
- When the cap fires:
  - Archive the lifetime product in App Store Connect + Play Console (mark unavailable for new purchasers).
  - Existing lifetime purchasers **retain access forever** — RevenueCat entitlement does not expire.
  - **Replacement plan**: either (a) introduce a higher-priced one-time **"founder" tier** at $79.99 / 1199 TL, or (b) remove the lifetime SKU entirely and keep only monthly + yearly. Decision deferred to post-cap retrospective.

---

## 6. Free Tier (no change from current spec)

- Unlimited browse, detail pages, search.
- **5 AI "Öner Bana" queries per day**, enforced **server-side** (rate-limited by Firebase Auth UID or anon device ID). Resets daily at 00:00 user-local time.
- Watchlist + favorites (localStorage for guests, Firestore mirror for authed users).
- Onboarding completes without requiring payment.

---

## 7. Premium Tier (Phase 5 deliverables)

Premium adds **four proactive "Movie Night Agent" features** on top of unlimited AI:

1. **Unlimited AI "Öner Bana"** — no daily cap.
2. **Decide-for-Me** — AI picks **exactly 1** title for you when you can't decide. Inputs: history, owned platforms, mood, time-of-day.
3. **Pair Mode** — recommendations for **2 people** (QR-pairing two profiles, AI returns titles neither has seen and both would enjoy).
4. **Smart Notifications** — push when a new episode of a favorited series airs, or when a watchlist title lands on a new platform.
5. **Evening Assistant** — daily **20:00** proactive push: "tonight's pick" (3 hand-curated titles).

All Premium features sync across iOS + Android via RevenueCat receipt validation against the `premium` entitlement.

---

## 8. Free Trial Mechanics

- **7 days**, available **ONLY on subscription tiers** (monthly + yearly).
- **Lifetime = NO trial** (single purchase, immediate access).
- Trial offered via:
  - **iOS**: RevenueCat introductory offer linked to a StoreKit free-trial offer.
  - **Android**: RevenueCat introductory offer linked to a Google Play promotional offer.
- During the 7-day trial, the user's RevenueCat entitlement is `premium = active`. After 7 days:
  - If subscription auto-renews → entitlement stays active.
  - If user cancels before day 7 → entitlement flips to `inactive` at trial end.

---

## 9. Lifetime Archive Plan (operational checklist)

Tracked in RevenueCat dashboard:

- [ ] **Phase 6 launch + 0 days** — lifetime SKU live, counter starts at 0.
- [ ] **At 500 purchases** — internal alert, prepare archive comms.
- [ ] **At 1000 purchases OR Phase 6 + 90 days** (whichever first) — archive the lifetime product:
  - App Store Connect → mark IAP "Removed from Sale".
  - Play Console → mark one-time product "Inactive".
  - In-app paywall hides the lifetime tier.
- [ ] **Post-archive**: decide between "founder tier" replacement vs. remove entirely (retrospective).

Existing lifetime purchasers are unaffected — `premium` entitlement is permanent for them.

---

Decisions locked: 2026-05-13 — Berkan + Claude. Reference for Phase 5 (Premium Agent) + Phase 6 (iOS+Android launch).
