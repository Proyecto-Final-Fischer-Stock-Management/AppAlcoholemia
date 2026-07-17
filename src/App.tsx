import { useMemo, useState } from "react";

const ETHANOL_DENSITY_G_PER_ML = 0.789;
const ELIMINATION_RATE_GL_PER_HOUR = 0.15;
const SELECT_PLACEHOLDER_VALUE = "0";

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
  { label: "Otra bebida", abv: 0 },
];

const CUP_SIZES = [
  { label: "Shot", ml: 45 },
  { label: "Copa de vino", ml: 150 },
  { label: "Vaso chico", ml: 200 },
  { label: "Vaso fiesta", ml: 300 },
  { label: "Pinta / vaso grande", ml: 500 },
  { label: "Lata grande", ml: 473 },
  { label: "Medida manual", ml: 0 },
];

type IntakeMode = "cup" | "mix" | "grams";
type NumericInput = number | "";

type Intake = {
  id: number;
  mode: IntakeMode;
  name: string;
  quantity: NumericInput;
  cupMl: NumericInput;
  abv: NumericInput;
  fillPercent: NumericInput;
  alcoholPartPercent: NumericInput;
  grams: NumericInput;
  hoursAgo: NumericInput;
};

type BodyCoefficient = {
  id: string;
  bodyType: string;
  description: string;
  sex: "Masculino" | "Femenino";
  r: number;
};

type BodyState = {
  coefficientId: string;
  weightKg: NumericInput;
};

const BODY_COEFFICIENTS: BodyCoefficient[] = [
  {
    id: "asthenic-male",
    bodyType: "Astenico",
    description: "Cuerpos delgados, altos, torax estrecho",
    sex: "Masculino",
    r: 0.85,
  },
  {
    id: "asthenic-female",
    bodyType: "Astenico",
    description: "Cuerpos delgados, altos, torax estrecho",
    sex: "Femenino",
    r: 0.76,
  },
  {
    id: "athletic-male",
    bodyType: "Atletico",
    description: "Cuerpos con fuerte musculatura",
    sex: "Masculino",
    r: 0.76,
  },
  {
    id: "athletic-female",
    bodyType: "Atletico",
    description: "Cuerpos con fuerte musculatura",
    sex: "Femenino",
    r: 0.67,
  },
  {
    id: "pyknic-male",
    bodyType: "Picnico",
    description: "Cuerpos redondeados y robustos, de baja estatura",
    sex: "Masculino",
    r: 0.64,
  },
  {
    id: "pyknic-female",
    bodyType: "Picnico",
    description: "Cuerpos redondeados y robustos, de baja estatura",
    sex: "Femenino",
    r: 0.58,
  },
  {
    id: "average-male",
    bodyType: "Valor promedio",
    description: "Promedio masculino",
    sex: "Masculino",
    r: 0.75,
  },
  {
    id: "average-female",
    bodyType: "Valor promedio",
    description: "Promedio femenino",
    sex: "Femenino",
    r: 0.67,
  },
];

const initialIntake = (id = Date.now()): Intake => ({
  id,
  mode: "cup",
  name: SELECT_PLACEHOLDER_VALUE,
  quantity: 1,
  cupMl: 0,
  abv: 0,
  fillPercent: 100,
  alcoholPartPercent: 50,
  grams: 14,
  hoursAgo: 1,
});

const formatNumber = (value: number, decimals = 2) =>
  Number.isFinite(value) ? value.toFixed(decimals) : "0.00";

const parseNumericInput = (value: string): NumericInput => (value === "" ? "" : Number(value));

const numericValue = (value: NumericInput) => (value === "" ? 0 : value);

function ethanolFromIntake(intake: Intake) {
  if (intake.mode === "grams") {
    return Math.max(0, numericValue(intake.grams)) * Math.max(0, numericValue(intake.quantity));
  }

  if (intake.mode === "mix") {
    const alcoholicMl =
      Math.max(0, numericValue(intake.cupMl)) *
      (Math.max(0, numericValue(intake.fillPercent)) / 100) *
      (Math.max(0, numericValue(intake.alcoholPartPercent)) / 100) *
      Math.max(0, numericValue(intake.quantity));

    return alcoholicMl * (Math.max(0, numericValue(intake.abv)) / 100) * ETHANOL_DENSITY_G_PER_ML;
  }

  const drinkMl =
    Math.max(0, numericValue(intake.cupMl)) *
    (Math.max(0, numericValue(intake.fillPercent)) / 100) *
    Math.max(0, numericValue(intake.quantity));

  return drinkMl * (Math.max(0, numericValue(intake.abv)) / 100) * ETHANOL_DENSITY_G_PER_ML;
}

function getSelectedCoefficient(body: BodyState) {
  return BODY_COEFFICIENTS.find(
    (coefficient) => coefficient.id === body.coefficientId,
  );
}

function getRiskLabel(bacGL: number) {
  if (bacGL <= 0) return { label: "Sin alcohol estimado", className: "ok" };
  if (bacGL < 0.3)
    return { label: "Bajo, pero ya puede afectar reflejos", className: "low" };
  if (bacGL < 0.8) return { label: "Alteracion clara", className: "warn" };
  if (bacGL < 1.5) return { label: "Riesgo alto", className: "danger" };
  return { label: "Riesgo muy alto", className: "critical" };
}

function bacContributionFromIntake(intake: Intake, distributionLiters: number) {
  const ethanolGrams = ethanolFromIntake(intake);
  const rawBacGL = distributionLiters > 0 ? ethanolGrams / distributionLiters : 0;
  const eliminatedGL = Math.min(
    rawBacGL,
    Math.max(0, numericValue(intake.hoursAgo)) * ELIMINATION_RATE_GL_PER_HOUR,
  );
  const currentBacGL = Math.max(0, rawBacGL - eliminatedGL);

  return {
    ethanolGrams,
    rawBacGL,
    eliminatedGL,
    currentBacGL,
  };
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
    coefficientId: SELECT_PLACEHOLDER_VALUE,
    weightKg: 75,
  });

  const [intakes, setIntakes] = useState<Intake[]>([initialIntake(1)]);

  const result = useMemo(() => {
    const coefficient = getSelectedCoefficient(body);
    const distributionLiters = Math.max(0, coefficient.r * numericValue(body.weightKg));
    const contributions = intakes.map((intake) => bacContributionFromIntake(intake, distributionLiters));
    const totalEthanolGrams = contributions.reduce((sum, contribution) => sum + contribution.ethanolGrams, 0);
    const rawBacGL = contributions.reduce((sum, contribution) => sum + contribution.rawBacGL, 0);
    const eliminatedGL = contributions.reduce((sum, contribution) => sum + contribution.eliminatedGL, 0);
    const currentBacGL = contributions.reduce((sum, contribution) => sum + contribution.currentBacGL, 0);
    const bacPercent = currentBacGL / 10;
    const standardDrinks = totalEthanolGrams / 14;

    return {
      totalEthanolGrams,
      coefficient,
      distributionLiters,
      rawBacGL,
      eliminatedGL,
      currentBacGL,
      bacPercent,
      standardDrinks,
    };
  }, [body, intakes]);

  const risk = getRiskLabel(result.currentBacGL);

  const updateBody = <K extends keyof BodyState>(
    key: K,
    value: BodyState[K],
  ) => {
    setBody((current) => ({ ...current, [key]: value }));
  };

  const updateIntake = <K extends keyof Intake>(
    id: number,
    key: K,
    value: Intake[K],
  ) => {
    setIntakes((current) =>
      current.map((intake) => {
        if (intake.id !== id) return intake;
        const next = { ...intake, [key]: value };

        if (key === "name") {
          if (value === SELECT_PLACEHOLDER_VALUE) {
            return { ...next, abv: 0 };
          }

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
            distribucion corporal y desgaste por tiempo de cada bebida.
          </p>
        </div>
        <div className="result-panel" aria-live="polite">
          <span className={`status ${risk.className}`}>{risk.label}</span>
          <strong>{formatNumber(result.currentBacGL, 3)} g/L</strong>
        </div>
      </section>

      <section className="grid">
        <article className="panel inputs-panel">
          <div className="section-heading">
            <div>
              <h2>Consumo</h2>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={addIntake}
            >
              + Agregar bebida
            </button>
          </div>

          <div className="intake-list">
            {intakes.map((intake, index) => (
              <div className="intake-card" key={intake.id}>
                <div className="intake-header">
                  <strong>Bebida {index + 1}</strong>
                  {intakes.length > 1 && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => removeIntake(intake.id)}
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <div
                  className="segmented"
                  role="group"
                  aria-label={`Modo de carga bebida ${index + 1}`}
                >
                  {[
                    ["cup", "Vaso"],
                    ["mix", "Trago"],
                    ["grams", "Gramos"],
                  ].map(([mode, label]) => (
                    <button
                      className={intake.mode === mode ? "active" : ""}
                      key={mode}
                      type="button"
                      onClick={() =>
                        updateIntake(intake.id, "mode", mode as IntakeMode)
                      }
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
                        onChange={(event) =>
                          updateIntake(intake.id, "name", event.target.value)
                        }
                      >
                        <option value={SELECT_PLACEHOLDER_VALUE}>
                          Seleccionar
                        </option>
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
                          onChange={(event) => updateIntake(intake.id, "abv", parseNumericInput(event.target.value))}
                        />
                        <span>%</span>
                      </div>
                    </Field>

                    <Field label="Medida del vaso">
                      <select
                        value={
                          CUP_SIZES.some((cup) => cup.ml === numericValue(intake.cupMl))
                            ? numericValue(intake.cupMl)
                            : 0
                        }
                        onChange={(event) => {
                          const ml = Number(event.target.value);
                          updateIntake(intake.id, "cupMl", ml);
                        }}
                      >
                        <option value={SELECT_PLACEHOLDER_VALUE}>
                          Seleccionar
                        </option>
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
                          onChange={(event) => updateIntake(intake.id, "cupMl", parseNumericInput(event.target.value))}
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
                          onChange={(event) =>
                            updateIntake(intake.id, "fillPercent", parseNumericInput(event.target.value))
                          }
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
                        onChange={(event) => updateIntake(intake.id, "quantity", parseNumericInput(event.target.value))}
                      />
                    </Field>

                    <Field label="Tiempo desde esta bebida" hint="Ejemplo: 1 = hace una hora, 0.5 = media hora">
                      <div className="input-suffix">
                        <input
                          min="0"
                          step="0.25"
                          type="number"
                          value={intake.hoursAgo}
                          onChange={(event) => updateIntake(intake.id, "hoursAgo", parseNumericInput(event.target.value))}
                        />
                        <span>h</span>
                      </div>
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
                              updateIntake(
                                intake.id,
                                "alcoholPartPercent",
                                parseNumericInput(event.target.value),
                              )
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
                          onChange={(event) => updateIntake(intake.id, "grams", parseNumericInput(event.target.value))}
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
                        onChange={(event) => updateIntake(intake.id, "quantity", parseNumericInput(event.target.value))}
                      />
                    </Field>
                    <Field label="Tiempo desde esta carga" hint="Ejemplo: 1 = hace una hora, 0.5 = media hora">
                      <div className="input-suffix">
                        <input
                          min="0"
                          step="0.25"
                          type="number"
                          value={intake.hoursAgo}
                          onChange={(event) => updateIntake(intake.id, "hoursAgo", parseNumericInput(event.target.value))}
                        />
                        <span>h</span>
                      </div>
                    </Field>
                  </div>
                )}

                <p className="mini-result">
                  Etanol estimado:{" "}
                  <strong>
                    {formatNumber(ethanolFromIntake(intake), 1)} g
                  </strong>
                </p>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Paso 2</p>
              <h2>Persona</h2>
            </div>
          </div>

          <div className="form-grid single">
            <Field label="Tipo de cuerpo / sexo biologico">
              <select
                value={body.coefficientId}
                onChange={(event) =>
                  updateBody("coefficientId", event.target.value)
                }
              >
                <option value={SELECT_PLACEHOLDER_VALUE}>Seleccionar</option>
                {BODY_COEFFICIENTS.map((coefficient) => (
                  <option value={coefficient.id} key={coefficient.id}>
                    {coefficient.bodyType} - {coefficient.sex} (r{" "}
                    {coefficient.r.toFixed(2)})
                  </option>
                ))}
              </select>
            </Field>

            <div className="coefficient-card">
              <span>Coeficiente elegido</span>
              <strong>r = {result.coefficient?.r.toFixed(2) ?? "0.00"}</strong>
              {result.coefficient && (
                <p>
                  {result.coefficient.bodyType}:{" "}
                  {result.coefficient.description}. {result.coefficient.sex}.
                </p>
              )}
            </div>

            <Field label="Peso">
              <div className="input-suffix">
                <input
                  min="1"
                  type="number"
                  value={body.weightKg}
                  onChange={(event) => updateBody("weightKg", parseNumericInput(event.target.value))}
                />
                <span>kg</span>
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
          (peso corporal x coeficiente r). Para cada bebida se resta el tiempo propio de esa bebida
          x 0.15 g/L. El resultado final es la suma de lo que queda de cada bebida.
        </p>
        <p>
          Los valores de r disponibles son los de la tabla por tipo corporal y
          sexo biologico. Es una herramienta educativa: comida, medicamentos,
          metabolismo, salud, ritmo de consumo y mediciones reales pueden
          cambiar el resultado. No sirve para decidir si una persona puede
          conducir.
        </p>
      </section>
    </main>
  );
}

export default App;
