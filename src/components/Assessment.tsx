import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart as ChartBar } from "lucide-react";
import jsPDF from "jspdf";

// Expanded Question Bank
const QUESTION_BANK = {
  SKIN: [
    "Rate your skin itching level.",
    "How often do you have skin redness?",
    "How severe is your skin scaling/flaking?",
    "How much burning sensation do you feel?",
    "Do you have oozing or discharge?",
    "How thickened is your skin in patches?",
    "Do you have cracks or fissures?",
    "Rate acne or pimples severity.",
    "Do you have visible skin lesions?",
    "Rate blackheads/whiteheads presence.",
  ],
  CHEST: [
    "Rate chest tightness.",
    "How often do you feel breathless?",
    "How severe is your cough?",
    "Do you have chest pain during activity?",
    "Rate wheezing sound when breathing.",
    "Do you have mucus production?",
    "Do you feel fatigue after small effort?",
    "Rate night-time breathing issues.",
    "How often do you wake gasping?",
    "Do you have palpitations?",
  ],
  ABDOMEN: [
    "Rate stomach pain.",
    "Do you feel bloated?",
    "How often do you feel nausea?",
    "Rate frequency of loose stools.",
    "Do you have heartburn?",
    "Rate abdominal cramps.",
    "Do you feel constipated?",
    "Rate vomiting episodes.",
    "Do you pass blood in stools?",
    "Do you have loss of appetite?",
  ],
  NEURO: [
    "Rate headache severity.",
    "Do you feel dizzy often?",
    "Do you have vision disturbances?",
    "Do you have sudden weakness?",
    "Do you have limb numbness?",
    "Rate frequency of seizures.",
    "Do you have memory loss?",
    "Do you have light/sound sensitivity?",
    "Do you feel imbalance?",
    "Have you had loss of consciousness?",
  ],
  URINARY: [
    "Rate burning during urination.",
    "How frequent is urination?",
    "Do you have difficulty starting urination?",
    "Rate urgency to urinate.",
    "Do you pass blood in urine?",
    "Do you have flank pain?",
    "Rate incomplete bladder emptying.",
    "Do you wake at night to urinate?",
    "Do you have fever with urinary symptoms?",
    "Do you feel lower abdominal heaviness?",
  ],
  EYE: [
    "Rate eye redness.",
    "Do your eyes itch?",
    "Rate eye dryness.",
    "Do you have light sensitivity?",
    "Is your vision blurry?",
    "Rate eye pain.",
    "Do you have eye discharge?",
    "Do you feel eye pressure?",
    "Do you see halos around lights?",
    "Rate frequency of watery eyes.",
  ],
  EAR: [
    "Rate ear pain.",
    "Do you have ear discharge?",
    "Do you hear ringing (tinnitus)?",
    "Do you feel ear fullness?",
    "Rate hearing loss.",
    "Do you feel ear itching?",
    "Do you feel dizzy?",
    "Do you have balance issues?",
    "Rate sensitivity to loud sounds.",
    "Do you feel popping in ears?",
  ],
  MUSCULOSKELETAL: [
    "Rate joint pain.",
    "Do you have joint stiffness?",
    "Rate swelling in joints.",
    "Do you have back pain?",
    "Do you have muscle weakness?",
    "Rate joint redness.",
    "Do you feel cracking sounds?",
    "Rate difficulty walking.",
    "Rate bone pain.",
    "Do you feel sudden muscle cramps?",
  ],
  ENT: [
    "Rate nasal congestion.",
    "Do you have runny nose?",
    "Rate sneezing episodes.",
    "Do you have facial pain/pressure?",
    "Do you have sore throat?",
    "Rate difficulty swallowing.",
    "Do you have hoarseness?",
    "Do you have postnasal drip?",
    "Rate sense of smell loss.",
    "Do you feel throat lump sensation?",
  ],
  CARDIOVASCULAR: [
    "Rate chest pain.",
    "Do you feel breathless on exertion?",
    "Do you have swelling in feet?",
    "Rate palpitations.",
    "Do you feel dizzy on standing?",
    "Rate fatigue.",
    "Do you have cold extremities?",
    "Rate bluish lips/fingers.",
    "Do you feel skipped heartbeats?",
    "Do you have sudden sweating episodes?",
  ],
  MISCELLANEOUS: [
    "Rate general fatigue.",
    "Do you feel weak?",
    "Rate dizziness.",
    "Do you feel depressed?",
    "Rate unexplained weight loss.",
    "Do you feel cold easily?",
    "Do you have dry skin?",
    "Rate hair loss.",
    "Do you feel anxious?",
    "Do you have excessive thirst?",
  ],
  GYNECOLOGICAL: [
    "Rate menstrual pain.",
    "Do you have irregular periods?",
    "Rate heavy bleeding.",
    "Do you have pelvic pain?",
    "Do you have facial hair growth?",
    "Rate acne severity.",
    "Do you feel bloated?",
    "Rate breast tenderness.",
    "Do you feel fatigue around periods?",
    "Do you have mood swings?",
  ]
};

type CategoryKey = keyof typeof QUESTION_BANK;

const DISEASES: Record<CategoryKey, {
  name: string;
  scoring: (a: number[]) => number;
  thresholds: { unlikely: number; mild: number; moderate: number; severe: number };
}[]> = {
  SKIN: [
    {
      name: "Eczema",
      scoring: (a) =>
        (a[0]*2)+(a[2]*1.5)+(a[5]*2)+(a[1]*1.5)+(a[4]*1)+(a[3]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Psoriasis",
      scoring: (a) =>
        (a[2]*2)+(a[1]*2)+(a[5]*2),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Acne",
      scoring: (a) =>
        (a[7]*2)+(a[9]*2)+(a[1]*1)+(a[3]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  CHEST: [
    {
      name: "Asthma",
      scoring: (a) =>
        (a[4]*1)+(a[1]*2)+(a[7]*1)+(a[0]*1.5),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Angina",
      scoring: (a) =>
        (a[0]*2)+(a[3]*1.5)+(a[1]*1.5)+(a[9]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Bronchitis",
      scoring: (a) =>
        (a[4]*2)+(a[5]*2)+(a[6]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  ABDOMEN: [
    {
      name: "Gastritis",
      scoring: (a) =>
        (a[0]*2)+(a[8]*1)+(a[1]*1)+(a[6]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "IBS",
      scoring: (a) =>
        (a[3]*1)+(a[4]*2)+(a[5]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Gastroenteritis",
      scoring: (a) =>
        (a[0]*1)+(a[4]*2)+(a[2]*2),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  NEURO: [
    {
      name: "Migraine",
      scoring: (a) =>
        (a[0]*2)+(a[7]*1)+(a[1]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Stroke",
      scoring: (a) =>
        (a[4]*2)+(a[6]*1)+(a[7]*1)+(a[9]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Epilepsy",
      scoring: (a) =>
        (a[5]*2)+(a[1]*1)+(a[3]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  URINARY: [
    {
      name: "UTI",
      scoring: (a) =>
        (a[0]*2)+(a[1]*2)+(a[4]*2)+(a[8]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "BPH",
      scoring: (a) =>
        (a[2]*1)+(a[6]*1)+(a[5]*1)+(a[0]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Kidney Stone",
      scoring: (a) =>
        (a[4]*2)+(a[5]*1.5)+(a[8]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  EYE: [
    {
      name: "Conjunctivitis",
      scoring: (a) =>
        (a[0]*2)+(a[1]*1.5)+(a[4]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Dry Eye",
      scoring: (a) =>
        (a[2]*2)+(a[3]*1.5)+(a[6]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Glaucoma",
      scoring: (a) =>
        (a[5]*2)+(a[8]*1)+(a[7]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  EAR: [
    {
      name: "Otitis",
      scoring: (a) =>
        (a[0]*2)+(a[1]*2)+(a[4]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Tinnitus",
      scoring: (a) =>
        (a[2]*2)+(a[3]*1)+(a[6]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Hearing Loss",
      scoring: (a) =>
        (a[4]*2)+(a[5]*1)+(a[7]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  MUSCULOSKELETAL: [
    {
      name: "Arthritis",
      scoring: (a) =>
        (a[0]*2)+(a[1]*1)+(a[2]*1)+(a[4]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Sprain",
      scoring: (a) =>
        (a[3]*2)+(a[5]*1)+(a[6]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Osteoporosis",
      scoring: (a) =>
        (a[7]*2)+(a[8]*1)+(a[9]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  ENT: [
    {
      name: "Sinusitis",
      scoring: (a) =>
        (a[0]*2)+(a[1]*1.5)+(a[3]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Tonsillitis",
      scoring: (a) =>
        (a[4]*2)+(a[5]*1)+(a[6]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Allergic Rhinitis",
      scoring: (a) =>
        (a[2]*2)+(a[7]*1)+(a[8]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  CARDIOVASCULAR: [
    {
      name: "Hypertension",
      scoring: (a) =>
        (a[0]*2)+(a[1]*1)+(a[2]*1)+(a[3]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Heart Failure",
      scoring: (a) =>
        (a[4]*2)+(a[5]*1)+(a[6]*1)+(a[7]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Arrhythmia",
      scoring: (a) =>
        (a[8]*2)+(a[9]*1)+(a[2]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  MISCELLANEOUS: [
    {
      name: "Fatigue Syndrome",
      scoring: (a) =>
        (a[0]*1)+(a[1]*1)+(a[4]*1)+(a[8]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Anemia",
      scoring: (a) =>
        (a[2]*2)+(a[5]*1)+(a[7]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Thyroid",
      scoring: (a) =>
        (a[3]*2)+(a[6]*1)+(a[9]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
  GYNECOLOGICAL: [
    {
      name: "PCOS",
      scoring: (a) =>
        (a[0]*2)+(a[1]*1.5)+(a[4]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Dysmenorrhea",
      scoring: (a) =>
        (a[2]*2)+(a[5]*1)+(a[6]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
    {
      name: "Fibroids",
      scoring: (a) =>
        (a[3]*2)+(a[7]*1)+(a[8]*1),
      thresholds: { unlikely: 0, mild: 21, moderate: 36, severe: 51 }
    },
  ],
};

function getSeverityLabel(score: number, thresholds: { unlikely: number; mild: number; moderate: number; severe: number }) {
  if (score >= thresholds.severe) return "Severe";
  if (score >= thresholds.moderate) return "Moderate";
  if (score >= thresholds.mild) return "Mild";
  return "Unlikely";
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  SKIN: "Skin",
  CHEST: "Chest",
  ABDOMEN: "Abdomen",
  NEURO: "Neurological",
  URINARY: "Urinary",
  EYE: "Eye",
  EAR: "Ear",
  MUSCULOSKELETAL: "Musculoskeletal",
  ENT: "ENT (Nose+Throat)",
  CARDIOVASCULAR: "Cardiovascular",
  MISCELLANEOUS: "Miscellaneous",
  GYNECOLOGICAL: "Gynecological",
};

const COLORS = ["#2563eb", "#f59e42", "#ef4444"]; // Blue, orange, red etc.

const MedicalAssessment: React.FC = () => {
  const [category, setCategory] = useState<CategoryKey>("SKIN");
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(1));
  const [results, setResults] = useState<{ name: string; score: number; severity: string }[] | null>(null);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value as CategoryKey);
    setAnswers(Array(10).fill(1));
    setResults(null);
  };

  const handleSliderChange = (idx: number, val: number) => {
    const tmp = [...answers];
    tmp[idx] = val;
    setAnswers(tmp);
  };

  const calculateResults = () => {
    const diseases = DISEASES[category];
    const out = diseases.map((d) => {
      const score = Math.round(d.scoring(answers));
      const severity = getSeverityLabel(score, d.thresholds);
      return { name: d.name, score, severity };
    });
    setResults(out);
  };

  const allUnlikely = results && results.length > 0 && results.every((r) => r.severity === "Unlikely");

  // Chart config for shadcn/ui chart, icon by disease
  const chartConfig = results
    ? results.reduce(
        (acc, r, idx) => ({
          ...acc,
          [r.name]: {
            label: r.name,
            icon: ChartBar,
            color:
              r.severity === "Severe"
                ? "#ef4444"
                : r.severity === "Moderate"
                ? "#f59e42"
                : r.severity === "Mild"
                ? "#2563eb"
                : "#6b7280", // Unlikely grey
          },
        }),
        {}
      )
    : {};

  const chartData = results
    ? results.map((r) => ({
        name: r.name,
        Score: r.score,
        Severity: r.severity,
      }))
    : [];

  const handleDownloadPDF = () => {
    if (!results) return;
    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(16);
    doc.text("Medical Assessment Results", 10, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Category: ${CATEGORY_LABELS[category]}`, 10, y);
    y += 8;

    doc.setFont("bold");
    doc.text("Your Answers:", 10, y);
    doc.setFont("normal");
    y += 7;

    QUESTION_BANK[category].forEach((q, i) => {
      doc.text(`${i + 1}. ${q}`, 10, y);
      doc.text(`Score: ${answers[i]}`, 170, y, { align: "right" });
      y += 6;
      if (y > 270) { doc.addPage(); y = 10; }
    });

    y += 4;
    doc.setFont("bold");
    doc.text("Assessment Results:", 10, y);
    doc.setFont("normal");
    y += 7;

    results.forEach((r) => {
      doc.text(`Disease: ${r.name}`, 10, y);
      doc.text(`Score: ${r.score}`, 80, y);
      doc.text(`Severity: ${r.severity}`, 130, y);
      y += 7;
      if (y > 270) { doc.addPage(); y = 10; }
    });

    if (results.every((r) => r.severity === "Unlikely")) {
      y += 7;
      doc.setTextColor(220, 30, 40);
      doc.text("No clear match found. Please consult a doctor.", 10, y);
      doc.setTextColor(0, 0, 0);
    }
    doc.save("assessment.pdf");
  };

  return (
    <div className="max-w-5xl mx-auto bg-card rounded-lg p-8 shadow-md mt-8 mb-12 border">
      <h1 className="text-2xl font-bold mb-6 text-primary text-center">Medical Assessment</h1>
      <div className="flex flex-col md:flex-row gap-8">
        {/* RESULTS LEFT */}
        <div className="md:w-2/5 order-2 md:order-1">
          {results && results.length > 0 && (
            <div className="bg-muted rounded-lg px-6 py-4">
              <h2 className="text-lg font-bold mb-4 text-primary">Assessment Results:</h2>
              {results.map((r) => (
                <div key={r.name} className="mb-3">
                  <span className="font-semibold">Disease: </span><span>{r.name}</span>
                  <br />
                  <span className="font-semibold">Score: </span><span>{r.score}</span>
                  <br />
                  <span className="font-semibold">Severity: </span>
                  <span
                    className={
                      r.severity === "Severe"
                        ? "text-red-500 font-bold"
                        : r.severity === "Moderate"
                        ? "text-orange-500 font-bold"
                        : r.severity === "Mild"
                        ? "text-blue-600 font-semibold"
                        : "text-muted-foreground"
                    }
                  >
                    {r.severity}
                  </span>
                </div>
              ))}
              {allUnlikely && (
                <div className="mt-4 text-center text-destructive font-bold">
                  No clear match found. Please consult a doctor.
                </div>
              )}
              {/* Download PDF Button */}
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={handleDownloadPDF}>
                  Download PDF
                </Button>
              </div>
              {/* Chart appears here */}
              {!allUnlikely && results.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                    <ChartBar className="text-primary" /> Visual Summary
                  </h3>
                  <ChartContainer config={chartConfig}>
                    <div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart
                          data={chartData}
                          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                        >
                          <XAxis dataKey="name" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} />
                          <Tooltip
                            content={
                              <ChartTooltipContent labelKey="name" />
                            }
                          />
                          <Bar
                            dataKey="Score"
                            radius={[8, 8, 0, 0]}
                            isAnimationActive={false}
                          >
                            {chartData.map((entry, idx) => (
                              <Cell
                                key={`cell-${entry.name}`}
                                fill={
                                  entry.Severity === "Severe"
                                    ? "#ef4444"
                                    : entry.Severity === "Moderate"
                                    ? "#f59e42"
                                    : entry.Severity === "Mild"
                                    ? "#2563eb"
                                    : "#6b7280"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <ChartLegendContent payload={chartData.map((r, i) => ({
                        value: r.name,
                        type: "rect",
                        color:
                          r.Severity === "Severe"
                            ? "#ef4444"
                            : r.Severity === "Moderate"
                            ? "#f59e42"
                            : r.Severity === "Mild"
                            ? "#2563eb"
                            : "#6b7280",
                        dataKey: r.name,
                      }))} />
                    </div>
                  </ChartContainer>
                </div>
              )}
            </div>
          )}
        </div>
        {/* FORM/QUESTIONS RIGHT */}
        <div className="md:w-3/5 order-1 md:order-2">
          <div className="mb-6 flex flex-col items-center">
            <label className="font-semibold mb-2">
              Select Category:
              <select
                value={category}
                onChange={handleCategoryChange}
                className="ml-2 px-3 py-2 rounded border bg-background shadow"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {QUESTION_BANK[category].map((q, i) => (
              <div key={i} className="mb-2">
                <span className="font-medium">{i + 1}. {q}</span>
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={answers[i]}
                    onChange={e => handleSliderChange(i, Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="inline-block w-8 text-center bg-secondary rounded px-1">
                    {answers[i]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mb-6">
            <Button size="lg" className="px-8 py-2" onClick={calculateResults}>
              Calculate Assessment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalAssessment;
