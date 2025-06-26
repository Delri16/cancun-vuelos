import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch";
import FormData from "form-data";
import cron from "node-cron";
import "dotenv/config";

puppeteer.use(StealthPlugin());

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Configuración de vuelos
const ORIGIN = "buea"; // Buenos Aires (Aeroparque)
const DESTINATIONS = [
  { code: "puj", name: "Punta Cana" },
  { code: "cun", name: "Cancún" },
];
const DATE_FROM = "260402"; // 2026-04-02
const DATE_TO = "260412"; // 2026-04-12

// Armar URL de Skyscanner
function buildSkyscannerUrl(origin, destination, dateFrom, dateTo) {
  return `https://www.espanol.skyscanner.com/transporte/vuelos/${origin}/${destination}/${dateFrom}/${dateTo}/?adultsv2=1&cabinclass=economy&childrenv2=&ref=home&rtn=1&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=false`;
}

async function screenshotAndSend(dest) {
  const url = buildSkyscannerUrl(ORIGIN, dest.code, DATE_FROM, DATE_TO);
  console.log(`🌐 Abriendo: ${url}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // Esperar a que cargue la lista de resultados (puede cambiar el selector si Skyscanner cambia)
  await new Promise((res) => setTimeout(res, 8000)); // Espera fija para asegurar carga

  const screenshot = await page.screenshot({ fullPage: false });
  await browser.close();

  // Enviar a Discord usando form-data de npm
  const form = new FormData();
  form.append("file", screenshot, {
    filename: `${dest.name.replace(/ /g, "_").toLowerCase()}_skyscanner.png`,
    contentType: "image/png",
  });
  form.append(
    "content",
    `✈️ Screenshot de resultados Skyscanner para **${dest.name}**\n${url}`
  );

  await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });
  console.log(`✅ Screenshot enviado a Discord para ${dest.name}`);
}

// Función principal para ambos destinos
async function main() {
  for (const dest of DESTINATIONS) {
    try {
      await screenshotAndSend(dest);
      await new Promise((res) => setTimeout(res, 5000)); // Espera entre destinos
    } catch (e) {
      console.error(`❌ Error para ${dest.name}:`, e.message);
    }
  }
}

// Generar hora random diaria entre 7:00 y 23:00
function getRandomHourMinute() {
  const hour = Math.floor(Math.random() * (23 - 7 + 1)) + 7;
  const minute = Math.floor(Math.random() * 60);
  return { hour, minute };
}

const { hour, minute } = getRandomHourMinute();
const cronTime = `${minute} ${hour} * * *`;
console.log(
  `⏰ El screenshot se tomará todos los días a las ${hour
    .toString()
    .padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
);

cron.schedule(
  cronTime,
  async () => {
    await main();
  },
  {
    timezone: "America/Argentina/Buenos_Aires",
  }
);

// Para test manual inmediato, descomenta la siguiente línea:
// main();
