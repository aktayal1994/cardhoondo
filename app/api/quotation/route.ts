import { NextRequest, NextResponse } from "next/server";
import { fetchCarModels, fetchVariantsForCar } from "../../../lib/data/fetchQuotationData";

/**
 * GET /api/quotation             -> { cars: [...] }      (model picker)
 * GET /api/quotation?car_id=X    -> { variants: [...] }  (variant picker)
 *
 * The pickers for the dealer-quote check. The analysis itself is
 * POST /api/quote-analysis. (This route used to also answer "what will this
 * car cost in my city" and save a lead; that price lookup was dropped because
 * on-road prices are available on every car site -- see
 * app/api/quote-analysis/route.ts for what replaced it.)
 */
export async function GET(req: NextRequest) {
  const carId = req.nextUrl.searchParams.get("car_id");
  try {
    if (carId) {
      const variants = await fetchVariantsForCar(carId);
      return NextResponse.json({ variants });
    }
    const cars = await fetchCarModels();
    return NextResponse.json({ cars });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load options", detail: err.message }, { status: 500 });
  }
}
