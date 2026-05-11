# Kiami

> Deja de construir filtros. Empieza a encontrar personas.

Kiami reemplaza las cadenas booleanas y los filtros infinitos de LinkedIn Recruiter, Apollo y Sales Navigator por una sola frase en lenguaje natural. Describes a quién buscas — talento o buyers — y Kiami te devuelve una lista priorizada de personas reales, con datos de contacto, contexto de por qué encajan, y la opción de agendar una llamada con un agente de voz IA al instante.

Demo en vivo: <https://kiami-production.up.railway.app>

---

## El hackathon

Kiami es una submission para el **GTM Hackathon** organizado por [LatamBuilds](https://www.latambuilds.com) — el primer hackathon de Go-to-Market de LatAm. La edición de Bogotá ocurre el **9–10 de mayo de 2026** y junta a 300+ founders, operadores y growth leaders para resolver retos reales de GTM en 48 horas, con pitch day al final.

- **Sponsors**: Make, Clay, Anthropic, Cursor, ElevenLabs, Supabase, Miro, Slack, Maca.
- **Reto**: producto end-to-end que automatice una pieza concreta del GTM, ejecutable en 48 horas.
- **Submission**: Kiami.

---

## Qué hace Kiami

Dos modos en la misma interfaz:

| Modo            | Para qué                                                                              |
| --------------- | ------------------------------------------------------------------------------------- |
| **Leads**       | Encontrar buyers que encajan con un ICP: industria, seniority, headcount, geografía. |
| **Recruiting**  | Encontrar candidatos por skills, experiencia, ubicación y seniority.                  |

En ambos modos, el flujo es el mismo:

1. **Tú escribes una frase**. Ej: `Heads of People at HR-Tech SaaS in DACH (50–250 employees) who recently raised Series-A`.
2. **Kiami infiere los filtros**. Un LLM traduce la frase a dos sets de filtros: uno **estricto** (la lectura precisa) y uno **laxo** (deliberadamente amplio — ±1 nivel de seniority, industrias adyacentes, 2–3x el headcount, ubicaciones más suaves).
3. **Busca en paralelo**. BetterContact se ejecuta con los filtros laxos como índice primario; Apollo entra como sweep ampliado si BC devuelve poco.
4. **Clasifica y prioriza**. Cada lead se evalúa contra los filtros estrictos. Los que pasan exacto se marcan como **high-profile** (máximo 5) y reciben un brief de outreach generado por IA. El resto queda como pool extendido para que filtres por tags.
5. **Acción inmediata**. Para cualquier lead, un clic en "Schedule call" dispara una llamada saliente con un agente de voz IA vía Dapta.

---

## Cómo funciona el prototipo

### Pipeline de búsqueda

El corazón vive en `convex/search.ts` — una acción Convex que orquesta toda la búsqueda:

```
[brief en lenguaje natural]
        │
        ▼
┌─────────────────────────────────────────┐
│ 1. Inferencia de filtros (OpenAI)       │
│    → set estricto + set laxo            │
│      • formato BetterContact             │
│      • formato Apollo                    │
└─────────────────────────────────────────┘
        │
        ├──────────────► BetterContact (filtros laxos, hasta 50 leads)
        │
        ├──────────────► Apollo  (fallback si BC < 30 leads)
        │
        ▼
┌─────────────────────────────────────────┐
│ 2. Sanitización + scoring                │
│    Cuenta cuántos slots estrictos       │
│    falla cada lead → strict_misses.     │
│    high_profile = ≤ 2 misses (cap 5).   │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ 3. Clasificación en paralelo (OpenAI)   │
│    Sales  → kind=lead, tier hot/warm    │
│    Recr.  → kind=candidate, shortlist…  │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ 4. Briefs para high-profile (OpenAI)    │
│    why_they_fit + suggested_opener      │
└─────────────────────────────────────────┘
        │
        ▼
[lista de leads + briefs + clasificación]
```

### Acciones Convex relevantes

- `convex/search.ts` — pipeline principal (`runSearch`).
- `convex/scheduleCall.ts` — handoff a Dapta para disparar llamada saliente.
- `convex/scrapeJob.ts` — extrae brief desde una URL de job posting.
- `convex/wrappers/ai/*` — wrappers tipados sobre el AI SDK (inferencia de filtros, clasificación, briefs, schemas Zod).
- `convex/wrappers/bc/*` — cliente de BetterContact con polling.
- `convex/wrappers/apollo/*` — cliente de Apollo People Search.

---

## Dapta por debajo

Kiami no construye el agente de voz desde cero — delega la conversación entera a [Dapta](https://dapta.ai), una plataforma no-code que crea agentes de voz y texto IA para automatizar llamadas, mensajes y workflows.

### Cómo se integra

Cuando el usuario hace clic en "Schedule call", el frontend invoca `scheduleCall` (acción Convex). La acción hace un `GET` al webhook de Dapta con todo lo que el agente necesita para conducir la llamada, encriptado en query params:

```
GET https://api.dapta.ai/api/<flow-id>/kiami
  ?x-api-key=…
  &name=<full_name>
  &phone=<phone-E.164>
  &email=<email>
  &company=<empresa-del-lead>
  &company_owner=<marca-del-vendedor>
  &flow=sales|recruiting
  &tier=high|low
  &brand_name=Kiami
  &brand_role=asesor comercial|reclutador
```

Dapta recibe el payload, contextualiza al agente con la marca / rol / lead, y dispara la llamada inmediatamente al `phone` indicado. El agente:

- Se presenta con la `brand_role` y `brand_name`.
- Adapta el discurso según `flow` (sales pitch vs. screening de candidato).
- Prioriza la conversación según `tier` (high-profile recibe scripts más personalizados).

### Qué corre Dapta debajo

Dapta es una plataforma propietaria — no publica su stack — pero como cualquier plataforma de agentes de voz, combina por debajo:

- **LLM** para la conversación (GPT-4-class).
- **Text-to-Speech** de baja latencia (ElevenLabs / Cartesia o similar).
- **Speech-to-Text** en streaming (Deepgram / Whisper).
- **Telefonía** (Twilio / LiveKit / Vonage) para el carrier-grade.
- **Orquestación** propia que mantiene la latencia de turn-taking bajo ~500 ms.

Lo que importa para Kiami: Dapta absorbe toda esa complejidad detrás de un único webhook HTTP. Kiami solo pasa contexto estructurado y la llamada está sonando en el teléfono del lead en segundos.

---

## Stack

### Frontend

- **TanStack Start** + **React 19** — SSR + routing.
- **Tailwind CSS 4** + **Phosphor Icons** — sistema de diseño.
- **Sonner** — toasts.
- **WorkOS AuthKit** — autenticación social/SSO.

### Backend

- **Convex** — runtime de funciones, base de datos y subscripciones en tiempo real.
  - Actions corren con `"use node"` para acceso a `fetch` y librerías Node.
  - Componentes oficiales: `@convex-dev/agent`, `@convex-dev/workflow`, `@convex-dev/workpool`, `@convex-dev/resend`.

### IA

- **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`).
- **OpenAI** vía Vercel AI Gateway — inferencia de filtros, clasificación, briefs.
- Schemas validados con **Zod** para forzar respuestas estructuradas.

### Datos

- **BetterContact** — índice primario de personas + empresas con datos verificados.
- **Apollo** — sweep extendido (people search público).

### Voz

- **Dapta** — agentes de voz IA, webhook-trigger.

### Infraestructura

- **Railway** — hosting de la app (frontend SSR).
- **Convex Cloud** — backend (deployment `disciplined-rhinoceros-168`).

---

## Correr el proyecto

```bash
# instalar
pnpm install

# variables de entorno: copiar .env.local.example a .env.local y llenar
cp .env.local.example .env.local

# dev (Convex + Vite en paralelo)
pnpm dev
```

Variables clave en `.env.local`:

```
VITE_CONVEX_URL=...
CONVEX_DEPLOYMENT=dev:...
WORKOS_CLIENT_ID=...
WORKOS_API_KEY=...
DAPTA_WEBHOOK_URL=...
DAPTA_API_KEY=...
BETTERCONTACT_API_KEY=...
APOLLO_API_KEY=...
OPENAI_API_KEY=...    # o token de Vercel AI Gateway
```

Deploy a Convex prod:

```bash
VERCEL_PROJECT_PRODUCTION_URL=<tu-url-prod> \
VERCEL_BRANCH_URL=<tu-url-prod> \
npx convex deploy --yes
```

(Las variables Vercel\* son para que el bloque `authKit` de `convex.json` resuelva en deploys que no son Vercel — Railway, por ejemplo.)

---

## Créditos

Submission al GTM Hackathon de LatamBuilds, Bogotá 2026.
