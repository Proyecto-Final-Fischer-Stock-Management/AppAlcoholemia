import { useMemo, useState } from "react";

const ETHANOL_DENSITY_G_PER_ML = 0.789;

const DRINKS = [
  { label: "Cerveza", abv: 5 },
  { label: "Vino", abv: 12 },
  { label: "Champagne / espumante", abv: 12 },
  { label: "Fernet", abv: 39 },
  { label: "Vodka", abv: 40 },
  { label: "Gin", abv: 40 },
  { label: "Ron", abv: 40 },
  { label: "Whisky", abv: 40 },
  { label: "Licor fuerte", abv: 35 },
  { label: "Personalizada", abv: 0 },
];

const CUP_SIZES = [
  { label: "Shot", ml: 45 },
  { label: "Copa de vino", ml: 150 },
  { label: "Vaso chico", ml: 200 },
  { label: "Vaso fiesta", ml: 300 },
  { label: "Pinta / vaso grande", ml: 500 },
  { label: "Lata grande", ml: 473 },
  { label: "Personalizado", ml: 0 },
];

type IntakeMode = "cup" | "mix" | "grams";
type BodyMode = "widmark" | "watson";
type Sex = "male" | "female" | "neutral" | "custom";

type Intake = {
  id: number;
  mode: IntakeMode;
  name: string;
  quantity: number;
  cupMl: number;
  abv: number;
  fillPercent: number;
  alcoholPartPercent: number;
  grams: number;
};

type BodyState = {
  mode: BodyMode;
  sex: Sex;
  customR: number;
  weightKg: number;
  heightCm: number;
  age: number;
  hours: number;
  eliminationRate: number;
};

const rBySex: Record<Sex, number> = {
  male: 0.68,
  female: 0.55,
  neutral: 0.61,
  custom: 0.61,
};

const initialIntake = (id = Date.now()): Intake => ({
  id,
  mode: "cup",
  name: "Cerveza",
  quantity: 1,
  cupMl: 300,
  abv: 5,
  fillPercent: 100,
  alcoholPartPercent: 50,
  grams: 14,
});

const formatNumber = (value: number, decimals = 2) =>
  Number.isFinite(value) ? value.toFixed(decimals) : "0.00";

function ethanolFromIntake(intake: Intake) {
  if (intake.mode === "grams") {
    return Math.max(0, intake.grams) * Math.max(0, intake.quantity);
  }

  if (intake.mode === "mix") {
    const alcoholicMl =
      Math.max(0, intake.cupMl) *
      (Math.max(0, intake.fillPercent) / 100) *
      (Math.max(0, intake.alcoholPartPercent) / 100) *
      Math.max(0, intake.quantity);

    return alcoholicMl * (Math.max(0, intake.abv) / 100) * ETHANOL_DENSITY_G_PER_ML;
  }

  const drinkMl =
    Math.max(0, intake.cupMl) *
    (Math.max(0, intake.fillPercent) / 100) *
    Math.max(0, intake.quantity);

  return drinkMl * (Math.max(0, intake.abv) / 100) * ETHANOL_DENSITY_G_PER_ML;
}

function calculateWatsonTotalBodyWaterLiters(body: BodyState) {
  if (body.weightKg <= 0 || body.heightCm <= 0 || body.age <= 0) {
    return 0;
  }

  if (body.sex === "female") {
    return -2.097 + 0.1069 * body.heightCm + 0.2466 * body.weightKg;
  }

  return 2.447 - 0.09516 * body.age + 0.1074 * body.heightCm + 0.3362 * body.weightKg;
}

function getBodyWaterLiters(body: BodyState) {
  if (body.mode === "watson") {
    return Math.max(0, calculateWatsonTotalBodyWaterLiters(body));
  }

  const coefficient = body.sex === "custom" ? body.customR : rBySex[body.sex];
  return Math.max(0, coefficient * body.weightKg);
}

function getRiskLabel(bacGL: number) {
  if (bacGL <= 0) return { label: "Sin alcohol estimado", className: "ok" };
  if (bacGL < 0.3) return { label: "Bajo, pero ya puede afectar reflejos", className: "low" };
  if (bacGL < 0.8) return { label: "Alteracion clara", className: "warn" };
  if (bacGL < 1.5) return { label: "Riesgo alto", className: "danger" };
  return { label: "Riesgo muy alto", className: "critical" };
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function App() {
  const [body, setBody] = useState<BodyState>({
    mode: "widmark",
    sex: "male",
    customR: 0.61,
    weightKg: 75,
    heightCm: 175,
    age: 25,
    hours: 1,
    eliminationRate: 0.15,
  });

  const [intakes, setIntakes] = useState<Intake[]>([initialIntake(1)]);

  const result = useMemo(() => {
    const totalEthanolGrams = intakes.reduce((sum, intake) => sum + ethanolFromIntake(intake), 0);
    const bodyWaterLiters = getBodyWaterLiters(body);
    const rawBacGL = bodyWaterLiters > 0 ? totalEthanolGrams / bodyWaterLiters : 0;
    const eliminatedGL = Math.max(0, body.hours) * Math.max(0, body.eliminationRate);
    const currentBacGL = Math.max(0, rawBacGL - eliminatedGL);
    const bacPercent = currentBacGL / 10;
    const standardDrinks = totalEthanolGrams / 14;

    return {
      totalEthanolGrams,
      bodyWaterLiters,
      rawBacGL,
      eliminatedGL,
      currentBacGL,
      bacPercent,
      standardDrinks,
    };
  }, [body, intakes]);

  const risk = getRiskLabel(result.currentBacGL);

  const updateBody = <K extends keyof BodyState>(key: K, value: BodyState[K]) => {
    setBody((current) => ({ ...current, [key]: value }));
  };

  const updateIntake = <K extends keyof Intake>(id: number, key: K, value: Intake[K]) => {
    setIntakes((current) =>
      current.map((intake) => {
        if (intake.id !== id) return intake;
        const next = { ...intake, [key]: value };

        if (key === "name") {
          const preset = DRINKS.find((drink) => drink.label === value);
          return { ...next, abv: preset?.abv ?? next.abv };
        }

        return next;
      }),
    );
  };

  const addIntake = () => {
    setIntakes((current) => [...current, initialIntake(Date.now())]);
  };

  const removeIntake = (id: number) => {
    setIntakes((current) => current.filter((intake) => intake.id !== id));
  };

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Calculadora orientativa</p>
          <h1>Alcoholemia en sangre</h1>
          <p>
            Carga vasos, tragos mezclados o gramos de etanol. La app estima etanol total,
            distribucion corporal y desgaste por tiempo.
          </p>
        </div>
        <div className="result-panel" aria-live="polite">
          <span className={`status ${risk.className}`}>{risk.label}</span>
          <strong>{formatNumber(result.currentBacGL, 3)} g/L</strong>
          <span>{formatNumber(result.bacPercent, 3)} % BAC</span>
        </div>
      </section>

      <section className="grid">
        <article className="panel inputs-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Paso 1</p>
              <h2>Consumo</h2>
            </div>
            <button className="secondary-button" type="button" onClick={addIntake}>
              + Agregar bebida
            </button>
          </div>

          <div className="intake-list">
            {intakes.map((intake, index) => (
              <div className="intake-card" key={intake.id}>
                <div className="intake-header">
                  <strong>Bebida {index + 1}</strong>
                  {intakes.length > 1 && (
                    <button type="button" className="ghost-button" onClick={() => removeIntake(intake.id)}>
                      Quitar
                    </button>
                  )}
                </div>

                <div className="segmented" role="group" aria-label={`Modo de carga bebida ${index + 1}`}>
                  {[
                    ["cup", "Vaso"],
                    ["mix", "Trago"],
                    ["grams", "Gramos"],
                  ].map(([mode, label]) => (
                    <button
                      className={intake.mode === mode ? "active" : ""}
                      key={mode}
                      type="button"
                      onClick={() => updateIntake(intake.id, "mode", mode as IntakeMode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {intake.mode !== "grams" && (
                  <div className="form-grid">
                    <Field label="Bebida alcoholica">
                      <select
                        value={intake.name}
                        onChange={(event) => updateIntake(intake.id, "name", event.target.value)}
                      >
                        {DRINKS.map((drink) => (
                          <option value={drink.label} key={drink.label}>
                            {drink.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Graduacion alcoholica">
                      <div className="input-suffix">
                        <input
                          min="0"
                          max="96"
                          step="0.1"
                          type="number"
                          value={intake.abv}
                          onChange={(event) => updateIntake(intake.id, "abv", Number(event.target.value))}
                        />
                        <span>%</span>
                      </div>
                    </Field>

                    <Field label="Medida del vaso">
                      <select
                        value={CUP_SIZES.some((cup) => cup.ml === intake.cupMl) ? intake.cupMl : 0}
                        onChange={(event) => {
                          const ml = Number(event.target.value);
                          if (ml > 0) updateIntake(intake.id, "cupMl", ml);
                        }}
                      >
                        {CUP_SIZES.map((cup) => (
                          <option value={cup.ml} key={cup.label}>
                            {cup.label} {cup.ml ? `(${cup.ml} ml)` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Ml reales del vaso">
                      <div className="input-suffix">
                        <input
                          min="0"
                          type="number"
                          value={intake.cupMl}
                          onChange={(event) => updateIntake(intake.id, "cupMl", Number(event.target.value))}
                        />
                        <span>ml</span>
                      </div>
                    </Field>

                    <Field label="Llenado">
                      <div className="input-suffix">
                        <input
                          min="0"
                          max="100"
                          type="number"
                          value={intake.fillPercent}
                          onChange={(event) => updateIntake(intake.id, "fillPercent", Number(event.target.value))}
                        />
                        <span>%</span>
                      </div>
                    </Field>

                    <Field label="Cantidad">
                      <input
                        min="0"
                        step="0.5"
                        type="number"
                        value={intake.quantity}
                        onChange={(event) => updateIntake(intake.id, "quantity", Number(event.target.value))}
                      />
                    </Field>

                    {intake.mode === "mix" && (
                      <Field
                        label="Parte alcoholica del trago"
                        hint="Ejemplo: fernet 70/30 con coca = 70%"
                      >
                        <div className="input-suffix">
                          <input
                            min="0"
                            max="100"
                            type="number"
                            value={intake.alcoholPartPercent}
                            onChange={(event) =>
                              updateIntake(intake.id, "alcoholPartPercent", Number(event.target.value))
                            }
                          />
                          <span>%</span>
                        </div>
                      </Field>
                    )}
                  </div>
                )}

                {intake.mode === "grams" && (
                  <div className="form-grid">
                    <Field label="Etanol puro">
                      <div className="input-suffix">
                        <input
                          min="0"
                          step="0.1"
                          type="number"
                          value={intake.grams}
                          onChange={(event) => updateIntake(intake.id, "grams", Number(event.target.value))}
                        />
                        <span>g</span>
                      </div>
                    </Field>
                    <Field label="Cantidad de cargas">
                      <input
                        min="0"
                        step="0.5"
                        type="number"
                        value={intake.quantity}
                        onChange={(event) => updateIntake(intake.id, "quantity", Number(event.target.value))}
                      />
                    </Field>
                  </div>
                )}

                <p className="mini-result">
                  Etanol estimado: <strong>{formatNumber(ethanolFromIntake(intake), 1)} g</strong>
                </p>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Paso 2</p>
              <h2>Persona y tiempo</h2>
            </div>
          </div>

          <div className="segmented wide" role="group" aria-label="Metodo de composicion corporal">
            <button
              className={body.mode === "widmark" ? "active" : ""}
              type="button"
              onClick={() => updateBody("mode", "widmark")}
            >
              Coeficiente
            </button>
            <button
              className={body.mode === "watson" ? "active" : ""}
              type="button"
              onClick={() => updateBody("mode", "watson")}
            >
              Peso + altura
            </button>
          </div>

          <div className="form-grid single">
            <Field label="Sexo / composicion">
              <select value={body.sex} onChange={(event) => updateBody("sex", event.target.value as Sex)}>
                <option value="male">Hombre biologico (r 0.68)</option>
                <option value="female">Mujer biologica (r 0.55)</option>
                <option value="neutral">Intermedio (r 0.61)</option>
                <option value="custom">Personalizado</option>
              </select>
            </Field>

            {body.mode === "widmark" && body.sex === "custom" && (
              <Field label="Coeficiente r personalizado" hint="Valores habituales: 0.55 a 0.68">
                <input
                  min="0.4"
                  max="0.8"
                  step="0.01"
                  type="number"
                  value={body.customR}
                  onChange={(event) => updateBody("customR", Number(event.target.value))}
                />
              </Field>
            )}

            <Field label="Peso">
              <div className="input-suffix">
                <input
                  min="1"
                  type="number"
                  value={body.weightKg}
                  onChange={(event) => updateBody("weightKg", Number(event.target.value))}
                />
                <span>kg</span>
              </div>
            </Field>

            {body.mode === "watson" && (
              <>
                <Field label="Altura">
                  <div className="input-suffix">
                    <input
                      min="1"
                      type="number"
                      value={body.heightCm}
                      onChange={(event) => updateBody("heightCm", Number(event.target.value))}
                    />
                    <span>cm</span>
                  </div>
                </Field>
                <Field label="Edad">
                  <input
                    min="1"
                    type="number"
                    value={body.age}
                    onChange={(event) => updateBody("age", Number(event.target.value))}
                  />
                </Field>
              </>
            )}

            <Field label="Tiempo desde que empezo a beber">
              <div className="input-suffix">
                <input
                  min="0"
                  step="0.25"
                  type="number"
                  value={body.hours}
                  onChange={(event) => updateBody("hours", Number(event.target.value))}
                />
                <span>h</span>
              </div>
            </Field>

            <Field
              label="Desgaste por hora"
              hint="Promedio usado: 0.15 g/L por hora. Puede variar mucho entre personas."
            >
              <div className="input-suffix">
                <input
                  min="0"
                  max="0.3"
                  step="0.01"
                  type="number"
                  value={body.eliminationRate}
                  onChange={(event) => updateBody("eliminationRate", Number(event.target.value))}
                />
                <span>g/L/h</span>
              </div>
            </Field>
          </div>
        </aside>
      </section>

      <section className="summary-grid">
        <article className="metric">
          <span>Etanol total</span>
          <strong>{formatNumber(result.totalEthanolGrams, 1)} g</strong>
        </article>
        <article className="metric">
          <span>Tragos estandar</span>
          <strong>{formatNumber(result.standardDrinks, 1)}</strong>
        </article>
        <article className="metric">
          <span>Antes del tiempo</span>
          <strong>{formatNumber(result.rawBacGL, 3)} g/L</strong>
        </article>
        <article className="metric">
          <span>Alcohol eliminado</span>
          <strong>{formatNumber(result.eliminatedGL, 3)} g/L</strong>
        </article>
      </section>

      <section className="formula-panel">
        <h2>Formula usada</h2>
        <p>
          Etanol = ml de bebida x graduacion x 0.789. Alcoholemia inicial = gramos de etanol /
          litros de agua corporal. Resultado final = alcoholemia inicial - horas x desgaste.
        </p>
        <p>
          La estimacion por coeficiente usa r de Widmark. La opcion de peso + altura estima agua
          corporal con Watson. Es una herramienta educativa: comida, medicamentos, metabolismo,
          salud, ritmo de consumo y mediciones reales pueden cambiar el resultado. No sirve para
          decidir si una persona puede conducir.
        </p>
      </section>
    </main>
  );
}

export default App;
