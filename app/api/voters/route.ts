import { NextResponse } from "next/server";
import { ensureDefaultEvent } from "../../lib/storage";
import { isValidDayKey } from "../../lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId")?.trim();
    const day = searchParams.get("day")?.trim();

    if (!eventId || !day) {
      return NextResponse.json(
        { message: "eventId y day son obligatorios" },
        { status: 400 }
      );
    }
    if (!isValidDayKey(day)) {
      return NextResponse.json({ message: "Día inválido" }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return NextResponse.json(
        { message: "El evento no existe" },
        { status: 400 }
      );
    }

    const selections = await driver.getVotersSelections(eventId);
    const voters = selections
      .filter((voter) => voter.days.includes(day))
      .map((voter) => ({
        name: voter.name,
        weight:
          typeof voter.weight === "number" && voter.weight > 0
            ? voter.weight
            : 1,
      }));
    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };
    return NextResponse.json({ voters }, { headers });
  } catch (error) {
    console.error("GET /api/voters", error);
    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };
    return NextResponse.json(
      { message: "No se pudo obtener la lista de votos" },
      { status: 500, headers }
    );
  }
}
