import { ensureDefaultEvent } from "../../lib/storage";
import { isValidDayKey } from "../../lib/dates";
import { jsonNoStore } from "../../lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId")?.trim();
    const day = searchParams.get("day")?.trim();

    if (!eventId || !day) {
      return jsonNoStore({ message: "eventId y day son obligatorios" }, { status: 400 });
    }
    if (!isValidDayKey(day)) {
      return jsonNoStore({ message: "Día inválido" }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return jsonNoStore({ message: "El evento no existe" }, { status: 400 });
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
    return jsonNoStore({ voters });
  } catch (error) {
    console.error("GET /api/voters", error);
    return jsonNoStore(
      { message: "No se pudo obtener la lista de votos" },
      { status: 500 }
    );
  }
}
