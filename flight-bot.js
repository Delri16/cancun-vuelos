import fetch from "node-fetch";
import cron from "node-cron";
import "dotenv/config";

const API_HOST = "partners.api.skyscanner.net";
const API_KEY = process.env.SKYSCAN_API_KEY;
const WEBHOOK = process.env.DISCORD_WEBHOOK;

// Configuración de vuelos
const FROM = "BUE-sky"; // Buenos Aires
const DESTINATIONS = [
  { code: "PUJ-sky", name: "Punta Cana" },
  { code: "CUN-sky", name: "Cancún" },
];
const DATE_OUT = "2026-04-02";
const DATE_IN = "2026-04-12";

async function getCheapestFlight(origin, destination) {
  try {
    const url = `https://${API_HOST}/apigateway/v1/flights/browse/browsequotes/v1.0/AR/USD/es-ES/${origin}/${destination}/${DATE_OUT}`;
    console.log(`🔍 Consultando: ${origin} → ${destination}...`);

    const res = await fetch(url, {
      headers: { "api-key": API_KEY },
    });

    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status} - ${res.statusText}`);
    }

    const json = await res.json();

    if (!json.Quotes?.length) {
      console.log(`❌ No se encontraron vuelos para ${destination}`);
      return null;
    }

    // Encontrar el vuelo más barato
    const cheapest = json.Quotes.reduce((a, b) =>
      a.MinPrice < b.MinPrice ? a : b
    );

    return {
      destination: destination,
      destinationName:
        DESTINATIONS.find((d) => d.code === destination)?.name || destination,
      price: cheapest.MinPrice,
      direct: cheapest.Direct,
      carrierId: cheapest.OutboundLeg.CarrierIds[0],
      quoteDate: cheapest.QuoteDateTime,
    };
  } catch (error) {
    console.error(`❌ Error al consultar ${destination}:`, error.message);
    return null;
  }
}

async function getAllCheapestFlights() {
  const flights = [];

  for (const dest of DESTINATIONS) {
    const flight = await getCheapestFlight(FROM, dest.code);
    if (flight) {
      flights.push(flight);
    }
    // Pequeña pausa entre consultas para no sobrecargar la API
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return flights;
}

async function sendDiscord(flights) {
  try {
    if (flights.length === 0) {
      const msg = {
        content:
          `❌ **No se encontraron vuelos disponibles**\n\n` +
          `🛫 **Origen:** Buenos Aires (BUE)\n` +
          `🛬 **Destinos:** Punta Cana, Cancún\n` +
          `📅 **Fechas:** 2-12 abril 2026\n` +
          `📆 **Consultado:** ${new Date().toLocaleString("es-AR")}`,
      };

      await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
      return;
    }

    // Ordenar por precio (más barato primero)
    flights.sort((a, b) => a.price - b.price);

    let content = `✈️ **Vuelos Buenos Aires → Caribe**\n\n`;
    content += `🛫 **Origen:** Buenos Aires (BUE)\n`;
    content += `📅 **Fechas:** 2-12 abril 2026\n`;
    content += `📆 **Consultado:** ${new Date().toLocaleString("es-AR")}\n\n`;

    content += `**🏆 Mejores precios encontrados:**\n\n`;

    flights.forEach((flight, index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
      content += `${medal} **${flight.destinationName}**\n`;
      content += `   💵 USD ${flight.price}\n`;
      content += `   🛬 Directo: ${flight.direct ? "Sí" : "No"}\n\n`;
    });

    content += `🔗 [Buscar en Skyscanner](https://www.skyscanner.com.ar/)`;

    const msg = { content };

    const res = await fetch(WEBHOOK, {
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
}

// Función principal que se ejecuta diariamente
async function checkFlights() {
  console.log("🚀 Iniciando búsqueda de vuelos Buenos Aires → Caribe...");
  const flights = await getAllCheapestFlights();

  if (flights.length > 0) {
    console.log(`💰 Vuelos encontrados:`);
    flights.forEach((flight) => {
      console.log(`   ${flight.destinationName}: USD ${flight.price}`);
    });
    await sendDiscord(flights);
  } else {
    console.log("❌ No se pudo obtener información de vuelos");
    await sendDiscord([]);
  }

  console.log("✅ Revisión completada:", new Date().toLocaleString("es-AR"));
}

// Programar la tarea para ejecutarse todos los días a las 9:00 AM
cron.schedule("0 9 * * *", checkFlights, {
  timezone: "America/Argentina/Buenos_Aires",
});

// Ejecutar inmediatamente al iniciar el script
console.log("🤖 Bot de vuelos Caribe iniciado");
console.log(
  "⏰ Programado para ejecutarse diariamente a las 9:00 AM (hora de Argentina)"
);
console.log("🎯 Destinos: Punta Cana y Cancún");
console.log("🔄 Ejecutando primera búsqueda...");

checkFlights();
