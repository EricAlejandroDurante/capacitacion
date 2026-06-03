# capacitacion.cruza.pet

Página estática (una sola `index.html`) para la jornada de capacitación de
subgerencia y líderes. Vive en `https://capacitacion.cruza.pet`.

**Sin Docker, sin Kamal, sin puerto.** nginx bare-metal del VPS la sirve directo
desde `/var/www/capacitacion.cruza.pet`. SSL vía el cert wildcard Cloudflare
Origin `*.cruza.pet` que ya está en el servidor.

## Estructura

```
capacitacion/
├── index.html                          # la página (editá acá)
├── nginx/capacitacion-cruza-pet.conf   # server block (estático + redirect 80→443)
├── deploy.sh                           # rsync/scp al VPS + reload nginx
└── README.md
```

## Editar y publicar

Primera vez (config local, no versionada):

```bash
cp deploy.env.example deploy.env   # editá deploy.env con tu host del VPS
```

Después, cada vez que cambies la página:

1. Editá `index.html`.
2. `./deploy.sh`

El script copia el HTML al VPS, mantiene el server block, valida (`nginx -t`),
recarga nginx y verifica el origen con `--resolve` (no depende del DNS).

> **Repo público:** el host/IP de origen del VPS vive solo en `deploy.env`
> (gitignored). No se commitea para no exponer el origen detrás de Cloudflare.

## DNS (paso único, una sola vez)

En el dashboard de Cloudflare, zona `cruza.pet`:

| Tipo | Nombre        | Destino                  | Proxy        |
|------|---------------|--------------------------|--------------|
| A    | capacitacion  | _(IP de origen del VPS)_ | Proxied (🟠) |

La IP de origen no se publica acá a propósito (mantener Cloudflare útil).
Una vez creado el registro, `https://capacitacion.cruza.pet/` queda público con SSL.

## Cache de Cloudflare

CF puede cachear el HTML/assets hasta 4h (Browser Cache TTL del dashboard
override el origen). Si cambiás la página y no se refleja, activá **Dev Mode**
en CF > Caching, o purgá la URL. Para una página que cambia poco no es problema.
