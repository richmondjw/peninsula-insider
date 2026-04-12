import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const AUDIENCE_ID = '98686024-fa96-410f-82dd-12a20a666167';

export const POST: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'A valid email address is required.' }),
        { status: 400, headers }
      );
    }

    await resend.contacts.create({
      email,
      audienceId: AUDIENCE_ID,
    });

    return new Response(
      JSON.stringify({ ok: true, message: "You're in. First dispatch arrives next Wednesday." }),
      { status: 200, headers }
    );
  } catch (err: any) {
    // Resend returns 409 if contact already exists - treat as success
    if (err?.statusCode === 409) {
      return new Response(
        JSON.stringify({ ok: true, message: "You're already subscribed. Next dispatch: Wednesday 6pm." }),
        { status: 200, headers }
      );
    }

    console.error('Subscribe error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Try again in a moment.' }),
      { status: 500, headers }
    );
  }
};
