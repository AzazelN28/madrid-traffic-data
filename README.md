# Madrid Traffic Data

## ¿Cómo convertir coordenadas de UTM a WGS84?

Usando el programa **cs2cs** es fácil, sólo tienes que introducir la siguiente
línea:

```
cs2cs +proj=utm +zone=30 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs \
      +to \
      +proj=longlat +datum=WGS84 +no_defs 
```

Hecho con ❤ por ROJO 2 (http://rojo2.com)
