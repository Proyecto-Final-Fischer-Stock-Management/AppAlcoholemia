# App Alcoholemia

Calculadora orientativa de alcoholemia en sangre hecha con React, TypeScript y Vite.

## Como correrla

```bash
npm install
npm run dev
```

Para generar version de produccion:

```bash
npm run build
```

## Que calcula

- Gramos de etanol desde vasos estandar, tragos mezclados o gramos directos.
- Graduacion alcoholica de cada bebida.
- Proporcion alcoholica de tragos, por ejemplo fernet 70/30.
- Distribucion corporal por coeficiente `r` segun tipo de cuerpo/sexo biologico y peso.
- Desgaste del alcohol segun horas transcurridas, usando `0.15 g/L` por hora.

El resultado principal se muestra en `g/L` y tambien como `% BAC`.

Esta herramienta es educativa y aproximada. No debe usarse para decidir si alguien puede conducir.
