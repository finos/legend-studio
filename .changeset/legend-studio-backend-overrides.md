---
'@finos/legend-application-studio': patch
'@finos/legend-application-studio-bootstrap': patch
---

Studio declares its backend servers (SDLC, engine, engine query, depot, showcase, lakehouse contract, Legend AI) so they can be overridden from the backend servers dialog, reached from Developer Tools' new Backend Servers section; overriding the SDLC server also points SDLC authorization at it. The local development config enables backend overrides.
