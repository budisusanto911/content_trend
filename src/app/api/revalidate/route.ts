import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST() {
  // Clears the cache for all pages in the app so fresh data will be fetched
  revalidatePath('/', 'layout');
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
