import { NextRequest, NextResponse } from "next/server";
import { enrichPeople, searchPeople } from "@/lib/apollo";
import type { SearchFilters } from "@/types/lead";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchFilters;

    const { people, totalEntries } = await searchPeople(body);

    const results = body.enrichContacts
      ? await enrichPeople(people, Math.min(body.perPage ?? 25, 15))
      : people;

    return NextResponse.json({
      people: results,
      totalEntries,
      page: body.page ?? 1,
      perPage: body.perPage ?? 25,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search request failed";
    const status = message.includes("APOLLO_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
