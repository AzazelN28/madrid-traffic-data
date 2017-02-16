# Leéme

Ésta carpeta contiene un montón de scripts para descargarse datos de la web
oficial de datos abiertos de madrid.

Para descargar los datos actuales:
```sh
./current
```

Para descargar datos de años/meses pasados:
```sh
./previous
```

Para preparar los datos para su inserción en una base de datos MongoDB:
```sh
./prepare
```

## Directorios

- downloads: Aquí se encontrarán todos los archivos descargados usando `previous`.
- locations: Aquí se encuentran todos los datos y scripts necesarios para posicionar los puntos de medición.
- mongolongo: Programa que permite insertar múltiples líneas en MongoDB.
- mongocorto: Programa que permite insertar líneas de datos de una en una en MongoDB.
- packer: Convierte los datos .csv en datos binarios .bin.
