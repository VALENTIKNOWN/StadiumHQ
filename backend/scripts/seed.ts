import { prisma } from "../src/prisma.js";

async function main() {
  const team = await prisma.team.upsert({
    where: { name_country: { name: "FC Example", country: "Wonderland" } },
    update: {},
    create: { name: "FC Example", country: "Wonderland", league: "Premier League" }
  });

  const stadium = await prisma.stadium.create({
    data: {
      name: "Example Arena",
      city: "Sample City",
      country: "Wonderland",
      capacity: 60000,
      openingDate: new Date("2001-07-01"),
      architect: "Doe Architects",
      surface: "Grass",
      roof: "Retractable",
      pitchDimensions: "105m x 68m",
      history: "Inaugurated with a charity match.",
      wikiUrl: "https://en.wikipedia.org/wiki/Example",
      wikiImage: "https://upload.wikimedia.org/example.jpg",
      teams: { create: { teamId: team.id } }
    }
  });

  await prisma.mediaItem.create({
    data: {
      stadiumId: stadium.id,
      type: "VIDEO",
      title: "Tunnel Walkthrough",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
  });

  await prisma.socialEmbed.create({
    data: {
      stadiumId: stadium.id,
      provider: "YOUTUBE",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
  });

  process.stdout.write("Seeded.\n");
}

main().finally(async () => prisma.$disconnect());

// Ingest stadiums list
// npm run ingest:wikipedia \
// "Old Trafford" "Stamford Bridge (stadium)" "Tottenham Hotspur Stadium" "London Stadium" \
// "St James' Park" "Goodison Park" "Elland Road" "King Power Stadium" "Falmer Stadium" \
// "Selhurst Park" "Turf Moor" "Molineux Stadium" "St Mary's Stadium" "City Ground" \
// "Brentford Community Stadium" "Kenilworth Road" "Dean Court" "Hillsborough Stadium" \
// "Riverside Stadium" "Celtic Park" "Ibrox Stadium" "Hampden Park" "Principality Stadium" \
// "Murrayfield Stadium" "Stadium of Light" "Bramall Lane" "Villa Park" "Craven Cottage" "Anfield" "Etihad Stadium" "Emirates Stadium"


// npm run ingest:wikipedia \
// "Santiago Bernabéu Stadium" "Allianz Arena" "Westfalenstadion" "San Siro" \
// "Juventus Stadium" "Stadio Olimpico" "Parc des Princes" "Stade de France" \
// "Johan Cruyff Arena" "Philips Stadion" "De Kuip" "Metropolitano Stadium" \
// "Estádio da Luz" "Estádio do Dragão"

// npm run ingest:wikipedia \
// "Estadio Azteca" "Maracanã Stadium" "La Bombonera" "Estadio Monumental (Buenos Aires)"
