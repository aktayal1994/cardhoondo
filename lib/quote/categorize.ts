import type { QuoteCategory } from "./types";

/** Keyword rules, checked top to bottom -- the first match wins, so order
 * matters ("processing fee on a loan" must hit finance before the generic
 * dealer-fees rule). Dealer quotes use wildly different wording; these cover
 * the common ones and everything else falls to "other", which the person can
 * correct in the UI. Deterministic on purpose: no AI is involved, so quote
 * text never leaves our server. */
const RULES: { category: QuoteCategory; re: RegExp }[] = [
  { category: "discount", re: /discount|exchange|corporate|loyalty|scheme|cash\s*back|cashback|rebate|waiver|special offer|\boffer\b|benefit|concession|subsid/i },
  { category: "ex_showroom", re: /ex[\s.-]*show\s*room|ex[\s.-]*sr\b|vehicle price|car price|basic price|base price|list price|\bmrp\b|showroom price/i },
  { category: "hsrp", re: /hsrp|number\s*plate|high\s*security|registration\s*plate/i },
  { category: "tcs", re: /\btcs\b|tax collected|collected at source/i },
  { category: "fastag", re: /fastag|fast\s*-?\s*tag/i },
  { category: "insurance", re: /insur|zero[\s-]*dep|comprehensive|third[\s-]*party|own[\s-]*damage|engine\s*protect|return[\s-]*to[\s-]*invoice|\brti\b|consumable|\bncb\b|key\s*(replace|protect)|tyre\s*protect|\bidv\b/i },
  { category: "extended_warranty", re: /warrant|assurance|shield of trust|protection plan|\bew\b/i },
  { category: "service_package", re: /\bamc\b|service\s*(package|plan|contract|pack|care|pack)|maintenance|periodic\s*service|pre[\s-]*paid|wear\s*(and|&)\s*tear|\bspp\b|\bmcp\b|\bpms\b|labou?r\s*pack/i },
  { category: "roadside_assistance", re: /road\s*side|\brsa\b|assistance/i },
  { category: "rto", re: /\brto\b|road\s*tax|registration|reg\.?\s*(charges|fee)|life\s*tax|smart\s*card|green\s*tax|\bcess\b|permit/i },
  { category: "finance_fee", re: /loan|financ|hypothecat|\bemi\b|\bnbfc\b|foreclos|file\s*charge|bank/i },
  { category: "protection_coating", re: /teflon|ceramic|\bppf\b|paint\s*protect|anti[\s-]*rust|rust\s*-?\s*proof|under\s*body|underbody|coating|\bnano\b|\bwax\b|polish|scotchgard|fabric\s*protect|glass\s*coat|graphene|sanitiz|anti[\s-]*corros|silencer coat/i },
  { category: "dealer_fees", re: /handling|logistic|documentation|doc(s|ument)?\.?\s*(charges?|fees?)|\badmin|processing|dealer\s*(charges?|fees?)|delivery|\bpdi\b|pre[\s-]*delivery|facilitation|convenience|freight|transport|service\s*charge|agent|misc|other\s*charges?|additional\s*charges?|extra\s*charges?|\bfees?\b/i },
  {
    category: "accessories",
    re: /accessor|mud\s*flap|\bmats?\b|seat\s*cover|car\s*kit|combo|\bkit\b|\bfog\b|chrome|garnish|body\s*cover|perfume|music|speaker|camera|sensor|visor|\bguards?\b|scuff|carpet|spoiler|\bcover\b|cushion|steering\s*cover|wheel\s*(cap|cover)|door\s*edge|\bsill\b|beading|mirror\s*cover|monogram|\bgps\b|tracker|central\s*lock|sunroof|\balloy|infotainment|android|touch\s*screen|dash\s*cam|reverse|parking|air\s*purifier|ambient|roof\s*rail|carrier|bumper|grill|antenna|\bled\b|lamp|pack\b|package/i,
  },
];

export function categorize(label: string, amount: number): QuoteCategory {
  if (amount < 0) return "discount";
  for (const rule of RULES) {
    if (rule.re.test(label)) return rule.category;
  }
  return "other";
}

/** Words dealers use to pressure a buyer into an optional item. */
export const PRESSURE_WORDS = /mandatory|compulsory|must\b|essential|required|necessary|compulsion/i;
