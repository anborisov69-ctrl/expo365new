# /src/frontend — Open Sold Components Layer

This directory contains **presentation-layer components** that have been stabilized, publicly documented, and are considered "Open Sold" — production-ready building blocks for the EXPO 365 UI.

## Scope

- Reusable atomic components shared across verticals
- Design system primitives (not business-logic-bearing)
- Components exported for potential white-label use

## Structure

```
/src/frontend
  /components       # Atomic UI components (buttons, cards, badges)
  /layouts          # Page layout shells
  /icons            # Custom SVG icon wrappers
  /animations       # Framer Motion / CSS keyframe utilities
```

## Rules

- All components must follow [`/docs/MANIFESTO.md`](../../docs/MANIFESTO.md)
- No direct Supabase calls — data via props or hooks only
- Must be typed with TypeScript interfaces
- No emoji in any component output (see Manifesto §3)

## Relationship to /src/components

`/src/components/ui/` contains shadcn primitives. This `/src/frontend/` layer contains EXPO 365-branded compositions built on top of those primitives.
