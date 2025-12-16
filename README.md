# kamikazes-events

Mini webapp mobile-first para votar qué día celebrar un evento. Construida con Next.js (App Router), TypeScript estricto, Tailwind CSS, React Day Picker y persistencia con Vercel KV (o mock en memoria en local).

## Funcionalidad
- Selector de evento (incluye por defecto **Babyshower Mullor-Gallego V2**, id `babyshower-mullor-gallego-v2`), configurable desde la vista de Preferencias. Cada evento trae su propia ventana de voto.
- Nombre obligatorio (se guarda en `localStorage` y se vincula a un `clientId` generado en la primera visita).
- Calendario (ventana por evento, selección múltiple, solo fines de semana).
- Voto con feedback y refresco automático de resultados; un voto por persona (se reemplaza si cambias la selección).
- Vistas: `/` Votar, `/results` Resultados, `/settings` Preferencias (evento + nombre).
- Resultados ordenados por número de votos desc (empates por fecha asc).
- Persistencia: auto-selección de driver → KV si hay variables, mock en memoria si no.

## Desarrollo local (mock automático)
```bash
cd projects/kamikazes-events
npm install
npm run dev
```
Al no tener variables de KV, se usa el driver mock con el evento por defecto y votos de ejemplo precargados.

## Producción en Vercel con KV
1) Crea una instancia KV en Vercel (Storage → KV).  
2) Conéctala al proyecto.  
3) Obtén las variables: `vercel env pull .env.local`.  
4) Levanta local para validar: `npm run dev`.  
5) Deploy habitual (ej. `vercel --prod` o desde el dashboard).

Variables esperadas (`.env.local`):
```
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
```

## Scripts
- `npm run dev` – servidor de desarrollo Next.js.
- `npm run build` – build de producción.
- `npm run start` – serve del build.
- `npm run lint` – lint Next/ESLint.
- `npm run typecheck` – TypeScript sin emitir.

## Notas de implementación
- Endpoints bajo `/api/*` son server-only y manejan validaciones (400) y errores (500).
- `StorageDriver`: abstracción de persistencia con drivers KV y mock.
- Lazy init garantiza que el evento por defecto exista en cualquier consulta.
