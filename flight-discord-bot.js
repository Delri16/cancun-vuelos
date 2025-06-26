import fetch from "node-fetch";
import cron from "node-cron";
import "dotenv/config";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Fechas y configuración
const OUTBOUND_START = "2026-04-01T00:00:00"; // Ida (de Argentina al Caribe)
const OUTBOUND_END = "2026-04-02T23:00:00";
const INBOUND_START = "2026-04-12T00:00:00"; // Vuelta (del Caribe a Argentina)
const INBOUND_END = "2026-04-13T00:00:00";
const SOURCE = "Country%3AAR"; // Todo Argentina

// Destinos del Caribe
const DESTINATIONS = [
  { code: "City%3Acancun_mx", name: "Cancún" },
  { code: "City%3Apunta-cana_do", name: "Punta Cana" },
];

const COMMON_PARAMS = [
  "currency=usd",
  "locale=en",
  "adults=1",
  "children=0",
  "infants=0",
  "handbags=1",
  "holdbags=1",
  "cabinClass=ECONOMY",
  "sortBy=QUALITY",
  "sortOrder=ASCENDING",
  "applyMixedClasses=true",
  "allowReturnFromDifferentCity=false",
  "allowChangeInboundDestination=true",
  "allowChangeInboundSource=true",
  "allowDifferentStationConnection=true",
  "enableSelfTransfer=true",
  "allowOvernightStopover=true",
  "enableTrueHiddenCity=true",
  "enableThrowAwayTicketing=true",
  "outbound=SUNDAY%2CWEDNESDAY%2CTHURSDAY%2CFRIDAY%2CSATURDAY%2CMONDAY%2CTUESDAY",
  "transportTypes=FLIGHT",
  "contentProviders=FLIXBUS_DIRECTS%2CFRESH%2CKAYAK%2CKIWI",
  "limit=20",
  `outboundDepartureDateStart=${OUTBOUND_START}`,
  `outboundDepartureDateEnd=${OUTBOUND_END}`,
  `inboundDepartureDateStart=${INBOUND_START}`,
  `inboundDepartureDateEnd=${INBOUND_END}`,
].join("&");

const getFlights = async (destination) => {
  try {
    const url = `https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip?source=${SOURCE}&destination=${destination}&${COMMON_PARAMS}`;
    console.log(`🔍 Consultando: Argentina → ${destination}...`);
    console.log("🔗 URL de consulta:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "kiwi-com-cheap-flights.p.rapidapi.com",
      },
    });

    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      data = { error: "No se pudo parsear JSON", raw: await res.text() };
    }

    if (!res.ok) {
      // Enviar error y body a Discord
      await sendDebugToDiscord({
        error: `Error HTTP: ${res.status} - ${res.statusText}`,
        url,
        response: data,
      });
      if (res.status === 403) {
        throw new Error("Error 403: API key inválida o sin permisos");
      } else if (res.status === 429) {
        throw new Error("Error 429: Demasiadas consultas, espera un momento");
      } else {
        throw new Error(`Error HTTP: ${res.status} - ${res.statusText}`);
      }
    }

    if (!data.results || data.results.length === 0) {
      console.log(`❌ No se encontraron vuelos para ${destination}`);
      // También enviar el body para debug
      await sendDebugToDiscord({
        error: "No se encontraron vuelos",
        url,
        response: data,
      });
      return [];
    }
    // Enviar los primeros 2 resultados para debug
    await sendDebugToDiscord({
      info: "Primeros 2 resultados",
      url,
      results: data.results.slice(0, 2),
    });
    return data.results;
  } catch (error) {
    console.error(`❌ Error al consultar ${destination}:`, error.message);
    await sendDebugToDiscord({
      error: error.message,
      url: `https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip?source=${SOURCE}&destination=${destination}&${COMMON_PARAMS}`,
    });
    return [];
  }
};

const getAllFlights = async () => {
  let allFlights = [];

  for (const dest of DESTINATIONS) {
    const flights = await getFlights(dest.code);
    allFlights = allFlights.concat(
      flights.map((f) => ({ ...f, destinationName: dest.name }))
    );
    // Pausa más larga entre consultas para evitar límites de rate
    console.log("⏳ Esperando 3 segundos antes de la siguiente consulta...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return allFlights;
};

const sendToDiscord = async (flights) => {
  try {
    if (flights.length === 0) {
      const msg = {
        content:
          `❌ **No se encontraron vuelos disponibles**\n\n` +
          `🛫 **Origen:** Argentina\n` +
          `🛬 **Destinos:** Punta Cana, Cancún\n` +
          `📅 **Fechas:** 1-13 abril 2026\n` +
          `📆 **Consultado:** ${new Date().toLocaleString("es-AR")}\n\n` +
          `⚠️ **Posibles causas:**\n` +
          `• Las fechas están muy lejanas\n` +
          `• No hay vuelos directos disponibles\n` +
          `• Problemas temporales con la API`,
      };

      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
      return;
    }

    // Ordenar por precio (más barato primero)
    flights.sort((a, b) => a.price.amount - b.price.amount);

    let content = `✈️ **Vuelos Argentina → Caribe**\n\n`;
    content += `🛫 **Origen:** Argentina\n`;
    content += `📅 **Fechas:** 1-13 abril 2026\n`;
    content += `📆 **Consultado:** ${new Date().toLocaleString("es-AR")}\n\n`;

    content += `**🏆 Mejores precios encontrados (máx 20 por destino):**\n\n`;

    flights.forEach((flight, index) => {
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
      const departureDate = new Date(flight.departureDate).toLocaleDateString(
        "es-AR"
      );
      const returnDate = new Date(flight.returnDate).toLocaleDateString(
        "es-AR"
      );

      content += `${medal} **${flight.destinationName}**\n`;
      content += `   💵 USD ${flight.price.amount}\n`;
      content += `   📅 Ida: ${departureDate} / Vuelta: ${returnDate}\n`;
      content += `   🛫 [Ver vuelo](${flight.deepLink})\n\n`;
    });

    content += `🔗 [Buscar más opciones](https://www.kiwi.com/)`;

    const msg = { content };

    const res = await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });

    if (!res.ok) {
      throw new Error(`Error Discord: ${res.status}`);
    }

    console.log("✅ Mensaje enviado a Discord exitosamente");
  } catch (error) {
    console.error("❌ Error al enviar a Discord:", error.message);
  }
};

// Función principal que se ejecuta diariamente
const checkFlights = async () => {
  console.log("🚀 Iniciando búsqueda de vuelos Argentina → Caribe...");
  const flights = await getAllFlights();

  if (flights.length > 0) {
    console.log(`💰 Vuelos encontrados:`);
    flights.forEach((flight) => {
      console.log(`   ${flight.destinationName}: USD ${flight.price.amount}`);
    });
    await sendToDiscord(flights);
  } else {
    console.log("❌ No se pudo obtener información de vuelos");
    await sendToDiscord([]);
  }

  console.log("✅ Revisión completada:", new Date().toLocaleString("es-AR"));
};

// Programar la tarea para ejecutarse todos los días a las 9:00 AM
cron.schedule("0 9 * * *", checkFlights, {
  timezone: "America/Argentina/Buenos_Aires",
});

// Ejecutar inmediatamente al iniciar el script
console.log("🤖 Bot de vuelos Caribe (Kiwi.com) iniciado");
console.log(
  "⏰ Programado para ejecutarse diariamente a las 9:00 AM (hora de Argentina)"
);
console.log("🎯 Destinos: Punta Cana y Cancún");
console.log("🔑 API Key configurada:", RAPIDAPI_KEY ? "✅ Sí" : "❌ No");
console.log(
  "🔗 Discord Webhook configurado:",
  DISCORD_WEBHOOK ? "✅ Sí" : "❌ No"
);
console.log("🔄 Ejecutando primera búsqueda...");

checkFlights();

// Enviar debug a Discord
const sendDebugToDiscord = async (obj) => {
  try {
    const msg = {
      content:
        "```json\n" + JSON.stringify(obj, null, 2).slice(0, 1900) + "\n```",
    };
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
  } catch (e) {
    console.error("❌ Error al enviar debug a Discord:", e.message);
  }
};
