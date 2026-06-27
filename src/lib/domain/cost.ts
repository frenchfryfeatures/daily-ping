export type CostAssumptions = {
  daysPerMonth: number;
  whatsappTemplateCostInr: number;
  dataFetchCostPerGroupDayInr: number;
  infraBufferPerUserMonthInr: number;
  targetPricePerUserMonthInr: number;
  voiceNotesPerUserMonth: number;
};

export type CostEstimateInput = {
  activeUsers: number;
  averageBriefCharacters: number;
  cachedDataGroups: number;
  voiceReplyRate: number;
  assumptions?: Partial<CostAssumptions>;
};

export type CostScenario = {
  id: "sarvam-v2" | "sarvam-v3";
  label: string;
  model: "bulbul:v2" | "bulbul:v3";
  ttsCostPer10kCharsInr: number;
  monthlyTtsCostInr: number;
  monthlyTotalCostInr: number;
  costPerUserMonthInr: number;
  grossMarginPercent: number;
  notes: string[];
};

export type CostModel = {
  assumptions: CostAssumptions;
  activeUsers: number;
  averageBriefCharacters: number;
  cachedDataGroups: number;
  actualVoiceReplyRate: number;
  monthlyTextMessages: number;
  monthlyVoiceNotes: number;
  monthlyWhatsAppCostInr: number;
  monthlyDataCostInr: number;
  monthlyInfraBufferInr: number;
  scenarios: CostScenario[];
  recommendedScenarioId: CostScenario["id"];
  levers: {
    label: string;
    impact: string;
    status: "active" | "watch" | "planned";
  }[];
};

const sarvamPrices = {
  "sarvam-v2": 15,
  "sarvam-v3": 30,
} as const;

export const defaultCostAssumptions: CostAssumptions = {
  daysPerMonth: 30,
  whatsappTemplateCostInr: 0.115,
  dataFetchCostPerGroupDayInr: 0.4,
  infraBufferPerUserMonthInr: 2.5,
  targetPricePerUserMonthInr: 149,
  voiceNotesPerUserMonth: 30,
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function positiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function estimateMonthlyCost(input: CostEstimateInput): CostModel {
  const assumptions = { ...defaultCostAssumptions, ...input.assumptions };
  const activeUsers = Math.max(0, input.activeUsers);
  const averageBriefCharacters = Math.round(positiveNumber(input.averageBriefCharacters, 900));
  const cachedDataGroups = activeUsers > 0 ? Math.max(1, input.cachedDataGroups) : 0;
  const monthlyTextMessages = activeUsers * assumptions.daysPerMonth;
  const monthlyVoiceNotes = activeUsers * assumptions.voiceNotesPerUserMonth;
  const monthlyWhatsAppCostInr = roundMoney(monthlyTextMessages * assumptions.whatsappTemplateCostInr);
  const monthlyDataCostInr = roundMoney(cachedDataGroups * assumptions.daysPerMonth * assumptions.dataFetchCostPerGroupDayInr);
  const monthlyInfraBufferInr = roundMoney(activeUsers * assumptions.infraBufferPerUserMonthInr);

  const buildScenario = (
    id: CostScenario["id"],
    label: string,
    model: CostScenario["model"],
    notes: string[],
  ): CostScenario => {
    const ttsCostPer10kCharsInr = sarvamPrices[id];
    const monthlyTtsCostInr = roundMoney((monthlyVoiceNotes * averageBriefCharacters * ttsCostPer10kCharsInr) / 10_000);
    const monthlyTotalCostInr = roundMoney(monthlyWhatsAppCostInr + monthlyTtsCostInr + monthlyDataCostInr + monthlyInfraBufferInr);
    const costPerUserMonthInr = activeUsers ? roundMoney(monthlyTotalCostInr / activeUsers) : 0;
    const grossMarginPercent = assumptions.targetPricePerUserMonthInr
      ? Math.round(((assumptions.targetPricePerUserMonthInr - costPerUserMonthInr) / assumptions.targetPricePerUserMonthInr) * 100)
      : 0;

    return {
      id,
      label,
      model,
      ttsCostPer10kCharsInr,
      monthlyTtsCostInr,
      monthlyTotalCostInr,
      costPerUserMonthInr,
      grossMarginPercent,
      notes,
    };
  };

  const scenarios = [
    buildScenario("sarvam-v2", "Sarvam scale voice", "bulbul:v2", [
      "Lowest TTS cost for daily voice at scale.",
      "Use for default preset voices after QA approval.",
    ]),
    buildScenario("sarvam-v3", "Sarvam premium voice", "bulbul:v3", [
      "Better quality and Indian-language prosody for premium plans.",
      "Use for loved-one voice alternatives and high-retention users.",
    ]),
  ];

  const recommendedScenarioId = scenarios[1].grossMarginPercent >= 55 ? "sarvam-v3" : "sarvam-v2";

  return {
    assumptions,
    activeUsers,
    averageBriefCharacters,
    cachedDataGroups,
    actualVoiceReplyRate: input.voiceReplyRate,
    monthlyTextMessages,
    monthlyVoiceNotes,
    monthlyWhatsAppCostInr,
    monthlyDataCostInr,
    monthlyInfraBufferInr,
    scenarios,
    recommendedScenarioId,
    levers: [
      {
        label: "One canonical brief",
        impact: "Text and audio share the same generated content, so LLM/content cost is paid once.",
        status: "active",
      },
      {
        label: "Sarvam TTS default",
        impact: "Bulbul v2 keeps daily audio viable; v3 is reserved for premium or sensitive voice quality.",
        status: "active",
      },
      {
        label: "Service-window voice gate",
        impact: "Voice media is sent after user interaction, avoiding extra business-initiated template sends.",
        status: "active",
      },
      {
        label: "City-language-market cache",
        impact: "Weather, positive news, metals, and market data are fetched by shared cohort, not per user.",
        status: "active",
      },
      {
        label: "Brief length budget",
        impact: "Keep canonical text under 1,200 characters to protect TTS cost and WhatsApp readability.",
        status: averageBriefCharacters <= 1_200 ? "active" : "watch",
      },
    ],
  };
}
