import { ClipboardCheck, Gauge, ReceiptIndianRupee, Search } from "lucide-react";

/**
 * The car buying journey, stage by stage, and the CarDhoondo tool for each.
 * One source for the home page (desktop section + phone timeline), the phone
 * menu and the "what's next" strip on results/quote pages, so the story reads
 * the same everywhere. `href: null` means the tool is not built yet and shows
 * as "Coming soon" (never a dead link).
 */
export type JourneyStageId = "exploring" | "negotiating" | "delivery";

export interface JourneyTool {
  id: string;
  title: string;
  /** One line on what it does, and what review data powers it. */
  sub: string;
  href: string | null;
  icon: typeof Search;
  hero?: boolean;
}

export interface JourneyStage {
  id: JourneyStageId;
  step: string;
  label: string;
  question: string;
  tools: JourneyTool[];
}

export const JOURNEY: JourneyStage[] = [
  {
    id: "exploring",
    step: "01",
    label: "Exploring",
    question: "Which car fits my life?",
    tools: [
      {
        id: "find",
        title: "Find my car",
        sub: "11 quick questions. 2 or 3 cars that fit you, each backed by real owner and expert reviews.",
        href: "/questionnaire/core-requirements",
        icon: Search,
        hero: true,
      },
      {
        id: "test_drive",
        title: "Test drive checklist",
        sub: "What to try on your test drive, based on what owners complain about in that exact car.",
        href: null,
        icon: Gauge,
      },
    ],
  },
  {
    id: "negotiating",
    step: "02",
    label: "Negotiating",
    question: "Is this a fair price?",
    tools: [
      {
        id: "quote",
        title: "Dealer quote check",
        sub: "Enter the dealer's quote. See padded charges and the exact questions to ask, checked against real prices in 25 cities.",
        href: "/quotation",
        icon: ReceiptIndianRupee,
      },
    ],
  },
  {
    id: "delivery",
    step: "03",
    label: "Taking delivery",
    question: "Is my new car in perfect shape?",
    tools: [
      {
        id: "pdi",
        title: "Delivery inspection checklist",
        sub: "Check the car before you sign for it, with the weak spots reviewers found on your model at the top.",
        href: null,
        icon: ClipboardCheck,
      },
    ],
  },
];

/** The stages after `current`, for "what's next" strips. */
export function stagesAfter(current: JourneyStageId): JourneyStage[] {
  const i = JOURNEY.findIndex((s) => s.id === current);
  return JOURNEY.slice(i + 1);
}
