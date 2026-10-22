export { GET, dynamic } from '../edd/route';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = new URL(req.url);
    Object.entries(body).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val));
      }
    });

    const getReq = new Request(url.toString(), {
      method: 'GET',
      headers: req.headers,
    });

    const { GET } = await import('../edd/route');
    return GET(getReq);
  } catch (err: any) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json(
      { success: false, error: err.message || 'Invalid request body' },
      { status: 400 }
    );
  }
}
