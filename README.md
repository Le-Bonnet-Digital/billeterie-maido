billeterie-maido

## Debugging

Set the environment variable `VITE_DEBUG=true` when running in development to enable verbose debug logs. Logs are automatically suppressed in production builds.

# billeterie-maido

## Mode démonstration

Pour afficher un message indiquant qu'il s'agit d'un environnement de démonstration, définissez la variable d'environnement `VITE_SHOW_TEST_CREDENTIALS` à `true`.

```bash
VITE_SHOW_TEST_CREDENTIALS=true npm run dev
```

Ou ajoutez cette variable à votre fichier `.env` :

```
VITE_SHOW_TEST_CREDENTIALS=true
```

