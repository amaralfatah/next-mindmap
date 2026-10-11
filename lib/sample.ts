import { importMarkdown } from "@/lib/io";
import type { MindMap } from "@/lib/model";

/** A small, real-looking map so a first-time visitor can poke at Mind Map before making their own. */
const SAMPLE = `# Trip to Lombok

## Before
- **Book flights**
  > Compare Lion Air and Citilink for the 14th.
- Pack light
  - Rain jacket
  - Trekking shoes
- Exchange some cash

## During
- Rinjani trek
  - 2 nights, 3 days
  - Hire a local guide
- Gili islands
  - Snorkel at Gili Meno
- Kuta beach

## After
- Photo book
- Write it up

## Budget
- Flights
- Guide and porters
- Boats between islands

## People
- Rina
- Dimas
`;

export function createSampleMap(): MindMap {
  return importMarkdown(SAMPLE, "Trip to Lombok");
}
