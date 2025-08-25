# Schéma d'architecture

```mermaid
flowchart LR
  user[Utilisateur] --> app[Application React]
  app --> supabase[Supabase]
  supabase --> db[(Base de données)]
  supabase --> functions[Edge Functions]
```
